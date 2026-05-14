export interface OnnxContentEntry {
  id: string;
  title: string;
  uri: string;
  snippet: string;
  body: string;
  tags: string[];
}

export interface OnnxPromptTemplate {
  name: string;
  description: string;
  template: string;
  category: string;
}

export interface OnnxBinding {
  name: string;
  term: string;
  shape: string;
  type: string;
}

export interface OnnxModel {
  id: string;
  path: string;
  version: string;
  task: string;
  inputShape: string;
  outputShape: string;
  batchSize: number;
  latency: number;
  mapId: string;
  gpu: boolean;
  providers: string[];
  tags: string[];
  priority: number;
  available: string;
}

export interface OnnxMappingProfile {
  id: string;
  model: string;
  input: OnnxBinding[];
  output: OnnxBinding[];
}

export interface OnnxIndexPayload {
  entries: OnnxContentEntry[];
  prompts: OnnxPromptTemplate[];
  models: OnnxModel[];
  mappings: OnnxMappingProfile[];
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function decodeBase64(base64: string): Uint8Array {
  if (typeof atob !== 'undefined') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  return Uint8Array.from(Buffer.from(base64, 'base64'));
}

function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true);
}

export function serializeOnnxIndex(payload: unknown): Uint8Array {
  const text = JSON.stringify(payload);
  const payloadBytes = encodeUtf8(text);

  const vtableLength = 6;
  const tableSize = 8;
  const rootTableStart = 4 + vtableLength;
  const paddedRootTableStart = Math.ceil(rootTableStart / 4) * 4;
  const fieldEntryOffset = 4;
  const fieldValueOffset = 4;

  const tableEnd = paddedRootTableStart + tableSize;
  const payloadStart = Math.ceil(tableEnd / 4) * 4;
  const totalSize = payloadStart + 4 + payloadBytes.length;

  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);

  writeUint32(view, 0, paddedRootTableStart);

  const vtableStart = 4;
  writeUint16(view, vtableStart + 0, vtableLength);
  writeUint16(view, vtableStart + 2, tableSize);
  writeUint16(view, vtableStart + 4, fieldEntryOffset);

  const rootTableOffset = paddedRootTableStart;
  const vtableOffset = vtableStart - rootTableOffset;
  view.setInt16(rootTableOffset + 0, vtableOffset, true);
  view.setInt16(rootTableOffset + 2, 0, true);
  writeUint32(view, rootTableOffset + 4, fieldValueOffset);

  writeUint32(view, payloadStart, payloadBytes.length);
  buffer.set(payloadBytes, payloadStart + 4);

  return buffer;
}

export function parseOnnxIndexFromBytes(bytes: Uint8Array): OnnxIndexPayload {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rootTableOffset = view.getUint32(0, true);
  const vtableOffset = rootTableOffset + view.getInt16(rootTableOffset, true);
  const fieldOffset = view.getInt16(rootTableOffset + 4, true);

  if (fieldOffset === 0) {
    throw new Error('FlatBuffer root payload is missing the content field.');
  }

  const payloadIndirect = view.getUint32(rootTableOffset + fieldOffset, true);
  const payloadPos = rootTableOffset + fieldOffset + payloadIndirect;
  const jsonLength = view.getUint32(payloadPos, true);
  const jsonStart = payloadPos + 4;
  const jsonBytes = bytes.subarray(jsonStart, jsonStart + jsonLength);
  const jsonText = new TextDecoder().decode(jsonBytes);

  return JSON.parse(jsonText) as OnnxIndexPayload;
}

export function parseOnnxIndexFromBase64(base64: string): OnnxIndexPayload {
  return parseOnnxIndexFromBytes(decodeBase64(base64));
}
