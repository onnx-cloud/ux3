# Semantic Search with ONNX

Semantic search with ONNX is based on embedding content and matching queries by meaning rather than exact keywords.

The common workflow is:

1. Encode documents into vectors.
2. Store vectors in a compact index.
3. Compare query vectors against the index to find the most relevant passages.

ONNX models can produce those vectors efficiently and allow runtime retrieval for RAG applications.
