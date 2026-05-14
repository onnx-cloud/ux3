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

export interface OnnxIndexPayload {
  entries: OnnxContentEntry[];
  prompts: OnnxPromptTemplate[];
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

export function parseOnnxIndexFromBase64(base64: string): OnnxIndexPayload {
  const bytes = decodeBase64(base64);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rootTableOffset = view.getInt32(0, true);
  const vtableOffset = rootTableOffset + view.getInt16(rootTableOffset, true);
  const fieldOffset = view.getInt16(vtableOffset + 4, true);

  if (fieldOffset === 0) {
    throw new Error('FlatBuffer root payload is missing the content field.');
  }

  const payloadIndirect = view.getInt32(rootTableOffset + fieldOffset, true);
  const payloadPos = rootTableOffset + fieldOffset + payloadIndirect;
  const jsonLength = view.getInt32(payloadPos, true);
  const jsonStart = payloadPos + 4;
  const jsonBytes = bytes.subarray(jsonStart, jsonStart + jsonLength);
  const jsonText = new TextDecoder().decode(jsonBytes);

  return JSON.parse(jsonText) as OnnxIndexPayload;
}
