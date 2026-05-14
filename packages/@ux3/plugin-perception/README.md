# @ux3/plugin-perception

A UX3 plugin that provides speech and vision perception tools for MCP/LLM orchestration.

## Features

- `perception.speech.synthesize` — text-to-speech
- `perception.speech.transcribe` — speech-to-text
- `perception.vision.analyze` — image analysis
- `perception.vision.extractJson` — structured image data extraction
- `perception.perceptionCapabilities` — capability discovery

## Configuration

Set environment variables for your media provider, for example:

- `PERCEPTION_SPEECH_ENDPOINT`
- `PERCEPTION_SPEECH_API_KEY`
- `PERCEPTION_VISION_ENDPOINT`
- `PERCEPTION_VISION_API_KEY`

The plugin also supports shared GROQ/OpenAI-style env variables such as `GROQ_OPENAI_ENDPOINT` and `GROQ_API_KEY`.

## Usage

Register the plugin in your UX3 app and invoke the tools via MCP.

Example `config.plugins` entry:

```js
export const config = {
  plugins: [
    '@ux3/plugin-perception',
  ],
};
```

Then call the MCP tools from your agent or runtime.
