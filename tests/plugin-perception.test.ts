import { describe, expect, it } from 'vitest';
import PerceptionPlugin from '../packages/@ux3/plugin-perception/src/index.js';

describe('@ux3/plugin-perception', () => {
  it('exports a plugin object with mcp tools', () => {
    expect(PerceptionPlugin).toBeTypeOf('object');
    expect(PerceptionPlugin.name).toBe('@ux3/plugin-perception');
    expect(PerceptionPlugin.mcp?.tools?.some((tool: any) => tool.name === 'perception.speech.synthesize')).toBe(true);
  });

  it('returns perception capabilities', async () => {
    const result = await PerceptionPlugin.callTool?.('perception.perceptionCapabilities', {});
    expect(result).toEqual({
      speech: ['synthesize', 'transcribe'],
      vision: ['analyze', 'extractJson'],
      providers: ['openai', 'groq', 'custom'],
    });
  });
});
