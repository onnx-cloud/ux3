import type { Resource } from '@modelcontextprotocol/sdk/types.js';

export interface SpeechSynthesizeArgs {
  text: string;
  voice?: string;
  format?: 'wav' | 'mp3' | 'opus' | 'base64';
  speakingRate?: number;
  pitch?: number;
}

export interface SpeechTranscribeArgs {
  audio: string;
  language?: string;
  format?: 'text' | 'json';
  prompt?: string;
}

export interface VisionAnalyzeArgs {
  image: string;
  mode?: 'description' | 'labels' | 'objects' | 'full';
  maxTokens?: number;
}

export interface VisionExtractJsonArgs {
  image: string;
  schema: Record<string, unknown>;
  prompt?: string;
}

export const Perception = {
  SPEECH_SYNTHESIZE: 'perception.speech.synthesize',
  SPEECH_TRANSCRIBE: 'perception.speech.transcribe',
  VISION_ANALYZE: 'perception.vision.analyze',
  VISION_EXTRACT_JSON: 'perception.vision.extractJson',
  CAPABILITIES: 'perception.perceptionCapabilities',
} as const;

export const PerceptionResources = {
  DOCS: 'plugin://perception/docs',
  SCHEMA: 'plugin://perception/schema',
  MEDIA_TYPES: 'plugin://perception/media-types',
} as const;

function getEnvVariable(name: string, fallback?: string): string {
  return (typeof process !== 'undefined' && process.env ? process.env[name] : fallback) || '';
}

function resolveSpeechProvider() {
  return {
    provider: getEnvVariable('PERCEPTION_SPEECH_PROVIDER') || 'openai',
    endpoint: getEnvVariable('PERCEPTION_SPEECH_ENDPOINT') || getEnvVariable('GROQ_OPENAI_ENDPOINT') || '',
    apiKey: getEnvVariable('PERCEPTION_SPEECH_API_KEY') || getEnvVariable('GROQ_API_KEY') || '',
    model: getEnvVariable('PERCEPTION_SPEECH_MODEL') || getEnvVariable('GROQ_MODEL') || '',
  };
}

function resolveVisionProvider() {
  return {
    provider: getEnvVariable('PERCEPTION_VISION_PROVIDER') || 'groq',
    endpoint: getEnvVariable('PERCEPTION_VISION_ENDPOINT') || getEnvVariable('GROQ_OPENAI_ENDPOINT') || '',
    apiKey: getEnvVariable('PERCEPTION_VISION_API_KEY') || getEnvVariable('GROQ_API_KEY') || '',
    model: getEnvVariable('PERCEPTION_VISION_MODEL') || getEnvVariable('GROQ_MODEL') || '',
  };
}

async function callMediaApi(endpoint: string, apiKey: string, payload: Record<string, unknown>): Promise<any> {
  if (!endpoint) {
    throw new Error('@ux3/plugin-perception: endpoint is required for media API calls');
  }
  if (!apiKey) {
    throw new Error('@ux3/plugin-perception: apiKey is required for media API calls');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Perception API request failed: ${response.status} ${response.statusText} - ${details}`);
  }

  return response.json();
}

async function synthesizeSpeech(args: SpeechSynthesizeArgs) {
  const cfg = resolveSpeechProvider();
  if (!cfg.endpoint || !cfg.apiKey) {
    throw new Error('@ux3/plugin-perception.speech.synthesize: speech provider is not configured');
  }

  const body = {
    model: cfg.model || 'gpt-4o-mini-tts',
    voice: args.voice || 'alloy',
    input: args.text,
    format: args.format || 'opus',
    speakingRate: args.speakingRate ?? 1.0,
    pitch: args.pitch ?? 1.0,
  };
  const result = await callMediaApi(cfg.endpoint, cfg.apiKey, body);

  return {
    text: args.text,
    voice: args.voice ?? 'default',
    format: args.format ?? 'opus',
    audioBase64: result?.audio ?? '',
    metadata: {
      durationSeconds: result?.durationSeconds ?? null,
      sampleRate: result?.sampleRate ?? null,
      provider: cfg.provider,
      raw: result,
    },
  };
}

async function transcribeSpeech(args: SpeechTranscribeArgs) {
  const cfg = resolveSpeechProvider();
  if (!cfg.endpoint || !cfg.apiKey) {
    throw new Error('@ux3/plugin-perception.speech.transcribe: speech provider is not configured');
  }

  const body = {
    model: cfg.model || 'whisper-1',
    audio: args.audio,
    language: args.language ?? 'en',
    prompt: args.prompt || '',
  };
  const result = await callMediaApi(cfg.endpoint, cfg.apiKey, body);

  return {
    transcript: result?.transcript ?? '',
    language: result?.language ?? args.language ?? 'unknown',
    format: args.format ?? 'json',
    words: Array.isArray(result?.segments)
      ? result.segments.map((segment: any) => ({
          text: segment.text,
          start: segment.start,
          end: segment.end,
          confidence: segment.confidence,
        }))
      : [],
    metadata: {
      durationSeconds: result?.durationSeconds ?? null,
      provider: cfg.provider,
      raw: result,
    },
  };
}

async function analyzeVision(args: VisionAnalyzeArgs) {
  const cfg = resolveVisionProvider();
  if (!cfg.endpoint || !cfg.apiKey) {
    throw new Error('@ux3/plugin-perception.vision.analyze: vision provider is not configured');
  }

  const body = {
    model: cfg.model || 'gpt-4o-vision-preview',
    image: args.image,
    mode: args.mode || 'full',
    maxTokens: args.maxTokens ?? 1000,
  };
  const result = await callMediaApi(cfg.endpoint, cfg.apiKey, body);

  return {
    description: result?.description ?? result?.caption ?? '',
    labels: result?.labels ?? [],
    objects: result?.objects ?? [],
    metadata: {
      width: result?.width ?? null,
      height: result?.height ?? null,
      model: cfg.model,
      provider: cfg.provider,
      raw: result,
    },
  };
}

async function extractVisionJson(args: VisionExtractJsonArgs) {
  const cfg = resolveVisionProvider();
  if (!cfg.endpoint || !cfg.apiKey) {
    throw new Error('@ux3/plugin-perception.vision.extractJson: vision provider is not configured');
  }

  const body = {
    model: cfg.model || 'gpt-4o-vision-preview',
    image: args.image,
    schema: args.schema,
    prompt: args.prompt || 'Extract the requested information from the image and return valid JSON.',
  };
  const result = await callMediaApi(cfg.endpoint, cfg.apiKey, body);

  return {
    data: result?.data ?? result,
    schema: args.schema,
    diagnostics: result?.diagnostics ?? [],
    metadata: {
      model: cfg.model,
      provider: cfg.provider,
      confidence: result?.confidence ?? null,
      raw: result,
    },
  };
}

export const perceptionToolHandlers = {
  [Perception.SPEECH_SYNTHESIZE]: async (args: SpeechSynthesizeArgs) => synthesizeSpeech(args),
  [Perception.SPEECH_TRANSCRIBE]: async (args: SpeechTranscribeArgs) => transcribeSpeech(args),
  [Perception.VISION_ANALYZE]: async (args: VisionAnalyzeArgs) => analyzeVision(args),
  [Perception.VISION_EXTRACT_JSON]: async (args: VisionExtractJsonArgs) => extractVisionJson(args),
  [Perception.CAPABILITIES]: async () => ({
    speech: ['synthesize', 'transcribe'],
    vision: ['analyze', 'extractJson'],
    providers: ['openai', 'groq', 'custom'],
  }),
} as const satisfies Record<string, (args: any) => Promise<unknown>>;

export const perceptionResourceHandlers = {
  [PerceptionResources.DOCS]: async () => {
    return `# Perception Plugin\n\nUse perception tools to synthesize speech, transcribe audio, analyze images, and extract structured JSON from visual content. Configure providers via environment variables such as GROQ_API_KEY or PERCEPTION_* settings.\n\nTools:\n- \`perception.speech.synthesize\`\n- \`perception.speech.transcribe\`\n- \`perception.vision.analyze\`\n- \`perception.vision.extractJson\`\n- \`perception.perceptionCapabilities\``;
  },
  [PerceptionResources.SCHEMA]: async () => {
    return JSON.stringify({
      tools: [
        'perception.speech.synthesize',
        'perception.speech.transcribe',
        'perception.vision.analyze',
        'perception.vision.extractJson',
        'perception.perceptionCapabilities',
      ],
    }, null, 2);
  },
  [PerceptionResources.MEDIA_TYPES]: async () => {
    return JSON.stringify({
      speech: ['wav', 'mp3', 'opus', 'base64'],
      vision: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    }, null, 2);
  },
} as const satisfies Record<string, () => Promise<string>>;
