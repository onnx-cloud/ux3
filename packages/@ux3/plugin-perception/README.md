# @ux3/plugin-perception

A UX3 plugin that provides speech and vision perception tools for MCP/LLM orchestration.

## Features

- `perception.speech.synthesize` — text-to-speech
- `perception.speech.transcribe` — speech-to-text
- `perception.vision.analyze` — image analysis
- `perception.vision.extractJson` — structured image data extraction
- `perception.perceptionCapabilities` — capability discovery

## Installation

```bash
npm install @ux3/plugin-perception
```

## Basic Usage

```ts
import PerceptionPlugin from '@ux3/plugin-perception';

const app = initializeApp({
  plugins: [PerceptionPlugin],
});
```

## Plugin Usage

- Register the plugin in your UX3 app.
- Use MCP tool calls to access speech and vision capabilities.
- Provide provider credentials through environment variables.

## Configuration

Set environment variables for your media provider, for example:

- `PERCEPTION_SPEECH_ENDPOINT`
- `PERCEPTION_SPEECH_API_KEY`
- `PERCEPTION_VISION_ENDPOINT`
- `PERCEPTION_VISION_API_KEY`

The plugin also supports shared GROQ/OpenAI-style variables like `GROQ_OPENAI_ENDPOINT` and `GROQ_API_KEY`.

## API

- `perception.speech.synthesize` — text-to-speech via MCP.
- `perception.speech.transcribe` — audio transcription via MCP.
- `perception.vision.analyze` — image analysis via MCP.
- `perception.vision.extractJson` — structured JSON extraction from images.
- `perception.perceptionCapabilities` — list supported perception features.

## Example

```ts
const speech = await app.services.mcp.executeTool('perception.speech.synthesize', {
  text: 'Hello from UX3',
});

const analysis = await app.services.mcp.executeTool('perception.vision.analyze', {
  imageUrl: 'https://example.com/image.jpg',
});

console.log(analysis);
```

## Notes

- This plugin is designed for MCP-enabled workflows.
- Ensure media API credentials are configured securely.
