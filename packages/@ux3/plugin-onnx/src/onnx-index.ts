import { parseOnnxIndexFromBase64, type OnnxIndexPayload } from './flatbuffer-parser.js';
import { ONNX_INDEX_BASE64 } from './built-index.js';

let memoized: OnnxIndexPayload | null = null;

export function loadOnnxIndex(): OnnxIndexPayload {
  if (memoized) {
    return memoized;
  }

  memoized = parseOnnxIndexFromBase64(ONNX_INDEX_BASE64);
  return memoized;
}
