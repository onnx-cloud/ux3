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

export const contentEntries: OnnxContentEntry[] = [
  {
    id: 'onnx-runtime',
    title: 'ONNX Runtime Overview',
    uri: 'plugin://onnx/content/onnx-runtime',
    snippet: 'ONNX Runtime is a cross-platform inference engine for ONNX models, optimized for CPU and GPU deployment.',
    body: 'ONNX Runtime is a high-performance inference engine for ONNX models. It supports CPU and GPU execution, multiple execution providers, and portable deployment across cloud and edge devices.',
    tags: ['onnx', 'runtime', 'inference', 'deployment'],
  },
  {
    id: 'semantic-search',
    title: 'Semantic Search with ONNX',
    uri: 'plugin://onnx/content/semantic-search',
    snippet: 'Build a semantic search and RAG workflow using ONNX models to index documents and return best-matching content fragments.',
    body: 'A semantic search workflow with ONNX begins by indexing content, generating embeddings, and building a retrieval index. During query time, the index returns the most relevant passages and associated metadata.',
    tags: ['search', 'rag', 'embeddings', 'semantic'],
  },
  {
    id: 'prompt-templates',
    title: 'ONNX Prompt Templates',
    uri: 'plugin://onnx/content/prompt-templates',
    snippet: 'Use reusable prompt templates to scaffold ONNX content retrieval and ensure consistent agent responses.',
    body: 'Prompt templates let you separate prompt engineering from application logic. The ONNX plugin exposes templates for search, answer generation, and index-aware summarization.',
    tags: ['prompts', 'templates', 'engineering', 'rag'],
  },
  {
    id: 'index-architecture',
    title: 'FlatBuffer RAG Index Architecture',
    uri: 'plugin://onnx/content/index-architecture',
    snippet: 'The ONNX plugin stores corpus metadata and prompt templates in a compact FlatBuffer artifact for build-time indexing and runtime retrieval.',
    body: 'The FlatBuffer index enables fast, compact storage of search metadata and prompt catalogs. Build-time generation keeps runtime assets small and deterministic, while the plugin can load and query the index without requiring a full database.',
    tags: ['flatbuffer', 'index', 'architecture', 'build'],
  },
];

export const promptTemplates: OnnxPromptTemplate[] = [
  {
    name: 'onnx.prompt.search',
    description: 'A search prompt for answering direct ONNX knowledge queries using retrieved passages.',
    template: 'You are an ONNX assistant. Use the retrieved documents below to answer the query: "{{query}}". Prioritize accuracy and cite the most relevant content IDs.',
    category: 'search',
  },
  {
    name: 'onnx.prompt.summary',
    description: 'A summarization prompt for creating a concise explanation from ONNX content.',
    template: 'Summarize the retrieved ONNX content for the query "{{query}}" in a concise, developer-friendly format.',
    category: 'summary',
  },
  {
    name: 'onnx.prompt.tutorial',
    description: 'A tutorial prompt for explaining ONNX concepts as if teaching a new user.',
    template: 'Explain the following ONNX concept to a developer: "{{query}}". Use simple language and include practical examples.',
    category: 'tutorial',
  },
];
