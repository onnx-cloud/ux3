import { describe, expect, it, vi } from 'vitest';
import * as PdfPluginModule from '@ux3/plugin-pdf';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';

describe('@ux3/plugin-pdf', () => {
  it('registers an MCP tool for PDF generation', () => {
    expect(PdfPluginModule.PdfPlugin.mcp).toBeDefined();
    expect(PdfPluginModule.PdfPlugin.mcp?.tools?.[0]?.name).toBe('pdf.generate');
  });

  it('exports a markdown renderer', async () => {
    const html = await PdfPluginModule.renderMarkdownToHtml('# Hello');
    expect(html).toContain('<h1');
    expect(html).toContain('Hello');
  });

  it('strips frontmatter from rendered markdown', async () => {
    const html = await PdfPluginModule.renderMarkdownToHtml('---\ntitle: Test Page\n---\n# Hello');
    expect(html).toContain('<h1');
    expect(html).toContain('Hello');
    expect(html).not.toContain('title: Test Page');
    expect(html).not.toContain('---');
  });

  it('renders math and mermaid during paper PDF generation', async () => {
    const paperDir = join('tmp', 'plugin-pdf-paper-render');
    const paperFile = join(paperDir, '01-architecture.md');
    const source = `---\ntitle: Test Paper\n---\n\nThis is a math test:\n\n\`\`\`math\nconfidence = \\frac{validated}{total} \\times 100\n\`\`\`\n\nAnd a diagram:\n\n\`\`\`mermaid\nflowchart LR\nA-->B\n\`\`\``;

    await mkdir(paperDir, { recursive: true });
    await writeFile(paperFile, source, 'utf8');

    const result = await PdfPluginModule.generatePdfForPaper('test-paper', paperDir, 'tmp/plugin-pdf-output');

    expect(result.paperName).toBe('test-paper');
    expect(result.outputPath).toContain('tmp/plugin-pdf-output/test-paper.pdf');
    expect(result.bytes).toBeGreaterThan(0);

    await rm('tmp/plugin-pdf-paper-render', { recursive: true, force: true });
    await rm('tmp/plugin-pdf-output', { recursive: true, force: true });
  });
});
