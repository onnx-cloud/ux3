export function encodeQR(text: string, ecLevel: 'L' | 'M' | 'Q' | 'H' = 'M'): boolean[][] {
  const dataBytes = new TextEncoder().encode(text);
  const version = selectVersion(dataBytes.length, ecLevel);
  const size = version * 4 + 17;

  const codewords = encodeData(dataBytes, version, ecLevel);
  const ecCodewords = generateEC(codewords, version, ecLevel);
  const interleaved = interleave(codewords, ecCodewords, version, ecLevel);

  let bestMatrix: boolean[][] = [];
  let bestPenalty = Infinity;

  for (let mask = 0; mask < 8; mask++) {
    const matrix = buildMatrix(size, interleaved, version, ecLevel, mask);
    const penalty = scorePenalty(matrix);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMatrix = matrix;
    }
  }

  const result: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      result[y][x] = bestMatrix[y][x];
  return result;
}

// --- version / capacity ---

const EC_CODEWORDS: Record<string, number[]> = {
  L: [7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,26,28,30,30,32,30,32,34,34,36,36,38,40,42,44,46,48,50,52,54],
  M: [10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,30,30,32,32,34,34,36,36,38,38,40,40,42,42,44,44],
  Q: [13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,32,34,34,36,36,38,38,40,40,42,42,44,44,46,46,48],
  H: [17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,32,34,34,36,36,38,38,40,40,42,42,44,44],
};

const EC_BLOCKS: Record<string, number[][]> = {
  L: [[1,7],[1,10],[1,15],[1,20],[1,26],[2,18],[2,20],[2,24],[2,30],[2,18],[2,20],[2,24],[2,26],[2,30],[4,22],[4,24],[4,28],[4,30],[4,28],[4,28],[4,26],[4,28],[4,30],[4,30],[4,32],[4,30],[4,32],[8,34],[8,34],[8,36],[8,36],[8,38],[8,40],[8,42],[8,44],[8,46],[8,48],[8,50],[8,52],[8,54]],
  M: [[1,10],[1,16],[1,26],[2,18],[2,24],[4,16],[4,18],[4,22],[4,22],[4,26],[4,30],[4,22],[4,22],[4,24],[4,24],[4,28],[4,28],[4,26],[4,26],[4,26],[4,26],[4,28],[4,28],[4,28],[4,30],[4,30],[8,32],[8,32],[8,34],[8,34],[8,36],[8,36],[8,38],[8,38],[8,40],[8,40],[8,42],[8,42],[8,44],[8,44]],
  Q: [[1,13],[1,22],[2,18],[2,26],[4,18],[4,24],[6,18],[4,22],[8,20],[8,24],[8,28],[8,26],[8,24],[8,20],[4,30],[8,24],[8,28],[8,28],[8,26],[8,30],[8,28],[8,30],[8,30],[10,30],[10,32],[10,34],[12,34],[12,36],[12,36],[12,38],[12,38],[12,40],[12,42],[12,42],[12,44],[12,46],[12,48],[12,50],[12,52],[12,54]],
  H: [[1,17],[1,28],[2,22],[4,16],[4,22],[4,28],[6,26],[6,26],[8,24],[8,28],[8,24],[8,28],[12,22],[8,24],[4,24],[8,30],[8,28],[8,28],[8,26],[8,28],[8,30],[12,24],[12,30],[12,30],[12,30],[12,30],[12,32],[12,32],[12,34],[12,34],[12,36],[12,36],[12,38],[12,38],[12,40],[12,40],[12,42],[12,42],[12,44],[12,44]],
};

function selectVersion(dataLen: number, ec: string): number {
  for (let v = 0; v < 40; v++) {
    const ecCodewordsPerBlock = EC_CODEWORDS[ec][v];
    const [blocks] = EC_BLOCKS[ec][v];
    const totalDataCodewords = blocks * ecCodewordsPerBlock;
    const rawCap = totalDataCodewords + (v < 9 ? 0 : Math.ceil(totalDataCodewords / 2));
    const maxDataBits = rawCap * 8;
    const neededBits = 4 + 8 * (dataLen < 10 ? 8 : dataLen < 27 ? 10 : 16) + dataLen * 8 + 4;
    if (neededBits <= maxDataBits) return v + 1;
  }
  return 40;
}

// --- data encoding ---

function toBitsBE(n: number, len: number): number[] {
  const bits: number[] = [];
  for (let i = len - 1; i >= 0; i--) bits.push((n >> i) & 1);
  return bits;
}

function encodeData(data: Uint8Array, version: number, ec: string): number[] {
  const lenBits = version <= 9 ? 8 : 16;
  const bits: number[] = [];

  for (const b of toBitsBE(4, 4)) bits.push(b); // byte mode
  for (const b of toBitsBE(data.length, lenBits)) bits.push(b);

  for (const byte of data)
    for (const b of toBitsBE(byte, 8)) bits.push(b);

  for (const b of toBitsBE(0, 4)) bits.push(b); // terminator

  while (bits.length % 8 !== 0) bits.push(0);

  const ecCodewordsPerBlock = EC_CODEWORDS[ec][version - 1];
  const [blocks] = EC_BLOCKS[ec][version - 1];
  const totalCodewords = blocks * ecCodewordsPerBlock + (version < 9 ? 0 : Math.ceil(blocks * ecCodewordsPerBlock / 2));

  const totalBits = totalCodewords * 8;
  while (bits.length < totalBits) {
    const pb = bits.length % 8;
    if (pb === 0) for (const b of toBitsBE(0xEC, 8)) bits.push(b);
    else for (const b of toBitsBE(0x11, 8)) bits.push(b);
  }

  const result: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let val = 0;
    for (let j = 0; j < 8; j++) val = (val << 1) | (bits[i + j] || 0);
    result.push(val);
  }
  return result;
}

// --- Reed-Solomon ---

function generateEC(data: number[], version: number, ec: string): number[] {
  const ecCodewords = EC_CODEWORDS[ec][version - 1];
  const [blocks] = EC_BLOCKS[ec][version - 1];
  const totalData = data.length;
  const dataPerBlock = Math.floor(totalData / blocks);
  const rem = totalData % blocks;

  const result: number[] = [];

  for (let b = 0; b < blocks; b++) {
    const blockData = data.slice(
      b < rem ? b * (dataPerBlock + 1) : rem * (dataPerBlock + 1) + (b - rem) * dataPerBlock,
      b < rem ? (b + 1) * (dataPerBlock + 1) : rem * (dataPerBlock + 1) + (b - rem + 1) * dataPerBlock
    );

    const gen = rsGeneratorPoly(ecCodewords);
    const msg = new Int8Array(blockData.length + ecCodewords);
    for (let i = 0; i < blockData.length; i++) msg[i] = blockData[i];

    for (let i = 0; i < blockData.length; i++) {
      const factor = logAntiLog[msg[i]] || 0;
      if (factor === 0) {
        for (let j = 0; j < ecCodewords; j++) msg[i + j + 1] ^= 0;
      } else {
        for (let j = 0; j < ecCodewords; j++) {
          const genVal = gen[j];
          const prod = (factor + (genVal >= 0 ? logAntiLog[genVal] : 0)) % 255;
          msg[i + j + 1] ^= intAntilog[prod] || 0;
        }
      }
    }
    for (let i = 0; i < ecCodewords; i++) result.push(msg[blockData.length + i]);
  }
  return result;
}

const logAntiLog = (() => {
  const anti = new Int32Array(256);
  const log = new Int32Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    anti[i] = x;
    log[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11D : 0);
  }
  anti[255] = anti[0];
  return anti;
})();

const intAntilog = (() => {
  const anti = new Int32Array(256);
  let x = 1;
  for (let i = 0; i < 256; i++) {
    anti[i] = x;
    x = (x << 1) ^ (x >= 128 ? 0x11D : 0);
  }
  return anti;
})();

function rsGeneratorPoly(degree: number): number[] {
  const result = new Int8Array(degree + 1);
  result[0] = 1;
  for (let i = 0; i < degree; i++) {
    const a0 = logAntiLog[intAntilog[i]] || 0;
    for (let j = 0; j <= i; j++) {
      const t = result[j];
      result[j] = intAntilog[(logAntiLog[t] || 0) ^ a0] || 0;
    }
  }
  return Array.from(result.slice(0, degree));
}

// --- interleaving ---

function interleave(data: number[], ec: number[], version: number, ecLevel: string): number[] {
  const ecWords = EC_CODEWORDS[ecLevel][version - 1];
  const [blocks] = EC_BLOCKS[ecLevel][version - 1];
  const totalData = data.length;
  const dataPerBlock = Math.floor(totalData / blocks);
  const rem = totalData % blocks;

  const result: number[] = [];
  for (let i = 0; i < dataPerBlock + 1; i++) {
    for (let b = 0; b < blocks; b++) {
      const blockLen = b < rem ? dataPerBlock + 1 : dataPerBlock;
      if (i < blockLen) {
        const offset = b < rem ? b * (dataPerBlock + 1) : rem * (dataPerBlock + 1) + (b - rem) * dataPerBlock;
        if (data[offset + i] !== undefined) result.push(data[offset + i]);
      }
    }
  }
  for (let i = 0; i < ecWords; i++) {
    for (let b = 0; b < blocks; b++) {
      if (ec[b * ecWords + i] !== undefined) result.push(ec[b * ecWords + i]);
    }
  }
  return result;
}

// --- module placement ---

function buildMatrix(size: number, data: number[], version: number, ecLevel: string, mask: number): boolean[][] {
  const m: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder patterns
  const addFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const edge = x === 0 || x === 6 || y === 0 || y === 6;
        const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        if (edge || inner) m[oy + y][ox + x] = true;
      }
    }
  };
  addFinder(0, 0);
  addFinder(size - 7, 0);
  addFinder(0, size - 7);

  // Timing
  for (let i = 8; i < size - 8; i++) {
    m[6][i] = i % 2 === 0;
    m[i][6] = i % 2 === 0;
  }

  // Alignment patterns
  const alignPos = getAlignmentPositions(version);
  for (const ay of alignPos) {
    for (const ax of alignPos) {
      if ((ax < 9 && ay < 9) || (ax >= size - 8 && ay < 9) || (ax < 9 && ay >= size - 8)) continue;
      for (let y = -2; y <= 2; y++) {
        for (let x = -2; x <= 2; x++) {
          const edge = x === -2 || x === 2 || y === -2 || y === 2;
          const corner = (x === -2 && y === -2) || (x === 2 && y === -2) || (x === -2 && y === 2);
          if (edge && !corner) m[ay + y][ax + x] = true;
          else if (edge && corner) m[ay + y][ax + x] = false;
          else m[ay + y][ax + x] = true;
        }
      }
    }
  }

  // Reserve format/version info areas
  for (let i = 0; i < 9; i++) { m[i][8] = false; m[8][i] = false; }
  if (version >= 7) {
    for (let y = size - 11; y < size - 3; y++)
      for (let x = 0; x < 6; x++) m[y][x] = false;
    for (let y = 0; y < 6; y++)
      for (let x = size - 11; x < size - 3; x++) m[y][x] = false;
  }

  // Place data + EC
  let bitIdx = 0;
  let up = true;
  let x = size - 1;
  while (x > 0) {
    if (x === 6) x = 5;
    for (let row = 0; row < size; row++) {
      const y = up ? size - 1 - row : row;
      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const cx = x - colOffset;
        if (cx < 0) continue;
        if (m[y][cx] !== undefined && !isReserved(size, y, cx)) {
          const bit = bitIdx < data.length * 8 ? ((data[Math.floor(bitIdx / 8)] >> (7 - (bitIdx % 8))) & 1) : 0;
          const masked = applyMask(mask, y, cx) ? bit ^ 1 : bit;
          m[y][cx] = masked === 1;
          bitIdx++;
        }
      }
    }
    up = !up;
    x -= 2;
  }

  // Format info
  const formatBits = getFormatBits(ecLevel, mask);
  const formatPositions = getFormatPositions(size);
  for (let i = 0; i < 15; i++) {
    for (const [fy, fx] of formatPositions) {
      if (i < formatBits.length) m[fy[i]][fx[i]] = formatBits[i] === 1;
    }
  }

  return m;
}

function isReserved(size: number, y: number, x: number): boolean {
  if (y === 6 || x === 6) return true;
  if (x <= 8 && y <= 8) return true;
  if (x <= 8 && y >= size - 8) return true;
  if (x >= size - 8 && y <= 8) return true;
  if (y === 8 || x === 8) return true;
  return false;
}

function applyMask(mask: number, y: number, x: number): boolean {
  switch (mask) {
    case 0: return (y + x) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (y + x) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return (y * x) % 2 + (y * x) % 3 === 0;
    case 6: return ((y * x) % 2 + (y * x) % 3) % 2 === 0;
    case 7: return ((y + x) % 2 + (y * x) % 3) % 2 === 0;
    default: return false;
  }
}

function scorePenalty(m: boolean[][]): number {
  const size = m.length;
  let penalty = 0;

  // Adjacent modules
  for (let y = 0; y < size; y++) {
    let run = 0;
    let prev = false;
    for (let x = 0; x < size; x++) {
      if (m[y][x] === prev) run++;
      else { if (run >= 5) penalty += 3 + (run - 5); run = 1; prev = m[y][x]; }
    }
    if (run >= 5) penalty += 3 + (run - 5);
  }
  for (let x = 0; x < size; x++) {
    let run = 0;
    let prev = false;
    for (let y = 0; y < size; y++) {
      if (m[y][x] === prev) run++;
      else { if (run >= 5) penalty += 3 + (run - 5); run = 1; prev = m[y][x]; }
    }
    if (run >= 5) penalty += 3 + (run - 5);
  }

  // 2x2 blocks
  for (let y = 0; y < size - 1; y++)
    for (let x = 0; x < size - 1; x++)
      if (m[y][x] === m[y+1][x] && m[y][x] === m[y][x+1] && m[y][x] === m[y+1][x+1]) penalty += 3;

  // Finder-like patterns
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size - 6; x++) {
      if (m[y][x] && !m[y][x+1] && m[y][x+2] && m[y][x+3] && m[y][x+4] && !m[y][x+5] && m[y][x+6])
        if (m[y][x-4] || m[y][x+1] || m[y][x+5]) penalty += 40;
    }
  }
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size - 6; y++) {
      if (m[y][x] && !m[y+1][x] && m[y+2][x] && m[y+3][x] && m[y+4][x] && !m[y+5][x] && m[y+6][x])
        if (m[y-4]?.[x] || m[y+1]?.[x] || m[y+5]?.[x]) penalty += 40;
    }
  }

  // Dark/light balance
  let dark = 0;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (m[y][x]) dark++;
  const pct = Math.floor(dark / (size * size) * 100);
  penalty += Math.floor(Math.abs(pct - 50) / 5) * 10;

  return penalty;
}

function getAlignmentPositions(version: number): number[] {
  const size = version * 4 + 17;
  if (version === 1) return [];
  const count = 2 + (version - 1) * 2;
  const step = Math.floor(size / (count * 2)) * 2;
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const pos = size - 7 - (count - 1 - i) * step;
    result.push(pos);
  }
  return result;
}

function getFormatBits(ec: string, mask: number): number[] {
  const ecIdx = { L: 1, M: 0, Q: 3, H: 2 }[ec] || 0;
  let bits = (ecIdx << 3) | mask;
  let format = bits << 10;
  const genPoly = 0x537;
  for (let i = 14; i >= 10; i--) {
    if ((format >> i) & 1) format ^= genPoly << (i - 10);
  }
  format = ((bits << 10) | (format & 0x3FF)) ^ 0x5412;
  const result: number[] = [];
  for (let i = 14; i >= 0; i--) result.push((format >> i) & 1);
  return result;
}

function getFormatPositions(size: number): [number[], number[]][] {
  const y1 = [8,8,8,8,8,8,8,8,7,5,4,3,2,1,0];
  const x1 = [0,1,2,3,4,5,7,8,8,8,8,8,8,8,8];
  const y2 = [size-1,size-2,size-3,size-4,size-5,size-6,size-7,size-8,size-7];
  const x2 = [8,8,8,8,8,8,8,8,8];
  for (let i = 0; i < 6; i++) {
    y2.push(8);
    x2.push(5 - i);
  }
  return [[y1 as unknown as number[], x1 as unknown as number[]] as [number[], number[]],
          [y2 as unknown as number[], x2 as unknown as number[]] as [number[], number[]]];
}
