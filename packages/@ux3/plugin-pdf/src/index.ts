import type { Plugin } from '../../../../src/plugin/registry.js';
import type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';
import { renderMarkdownToHtml, renderPaperHtml, generatePdfFromHtml, generatePdfForPaper, generatePdfsForAllPapers, PdfGenerationResult, PdfGenerationOptions } from './pdf.js';
import { join, resolve } from 'path';

export interface PdfPluginUtils {
  renderMarkdownToHtml: (source: string) => Promise<string>;
  generatePdfFromHtml: (html: string, outputPath: string, options?: PdfGenerationOptions) => Promise<PdfGenerationResult>;
  generatePdfForPaper: (paperName: string, paperDir: string, outputRoot: string, options?: PdfGenerationOptions) => Promise<PdfGenerationResult>;
  generatePdfsForAllPapers: (papersDir: string, outputRoot: string, options?: PdfGenerationOptions) => Promise<PdfGenerationResult[]>;
}

let latestReport: Record<string, unknown> | null = null;

function resolveOutputPath(outputName: string): string {
  const normalized = outputName.toLowerCase().endsWith('.pdf') ? outputName : `${outputName}.pdf`;
  return resolve(process.cwd(), 'reports', 'pdf', normalized);
}

async function generatePdfTool(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const source = String(args.source ?? '');
  const sourceType = String(args.sourceType ?? 'markdown');
  const outputName = String(args.outputName ?? `document-${Date.now()}.pdf`);
  const format = (args.format as 'A4' | 'Letter') || 'A4';
  const margin = typeof args.margin === 'object' && args.margin !== null ? (args.margin as PdfGenerationOptions['margin']) : undefined;
  const layoutDir = typeof args.layoutDir === 'string' ? args.layoutDir : undefined;
  const outputPath = resolveOutputPath(outputName);

  if (!source) {
    throw new Error('pdf.generate requires a non-empty source string');
  }

  const html = sourceType === 'markdown'
    ? await renderMarkdownToHtml(source)
    : sourceType === 'html'
      ? source
      : '';

  if (sourceType === 'url') {
    const { chromium } = await import('playwright');
    const { writeFile, mkdir } = await import('fs/promises');
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(source, { waitUntil: 'networkidle' });
      const buffer = await page.pdf({
        format,
        printBackground: true,
        margin: margin ?? { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
      });
      await mkdir(join(process.cwd(), 'reports', 'pdf'), { recursive: true });
      await writeFile(outputPath, buffer);
      latestReport = { outputPath, sourceType, outputName, format, generatedAt: new Date().toISOString() };
      return latestReport;
    } finally {
      await browser.close();
    }
  }

  const documentHtml = renderPaperHtml(outputName, html);
  const result = await generatePdfFromHtml(documentHtml, outputPath, { format, margin, layoutDir });
  latestReport = { ...result, sourceType, outputName, format };
  return latestReport;
}

export const PdfPlugin: Plugin = {
  name: '@ux3/plugin-pdf',
  version: '0.1.0',
  description: 'PDF exporter plugin for UX3 with MCP tool support.',
  displayName: 'PDF',
  author: 'UX3 Team',
  categories: ['content', 'utility', 'tooling'],
  ux3PeerVersion: '^0.2.0',
  install(app) {
    (app as any).utils = (app as any).utils || {};
    (app as any).utils.pdf = {
      renderMarkdownToHtml,
      generatePdfFromHtml,
      generatePdfForPaper,
      generatePdfsForAllPapers,
    } as PdfPluginUtils;
  },
  mcp: {
    tools: [
      {
        name: 'pdf.generate',
        description: 'Generate a PDF from markdown, HTML, or a URL.',
        inputSchema: {
          type: 'object',
          properties: {
            source: { type: 'string' },
            sourceType: { type: 'string', enum: ['markdown', 'html', 'url'] },
            outputName: { type: 'string' },
            format: { type: 'string', enum: ['A4', 'Letter'] },
            margin: {
              type: 'object',
              properties: {
                top: { type: 'string' },
                bottom: { type: 'string' },
                left: { type: 'string' },
                right: { type: 'string' },
              },
              additionalProperties: false,
            },
            layoutDir: { type: 'string' },
          },
          required: ['source', 'sourceType'],
        },
      } as Tool,
    ],
    resources: [
      {
        name: 'plugin://pdf/latest',
        uri: 'plugin://pdf/latest',
        description: 'Metadata for the latest generated PDF artifact.',
        mimeType: 'application/json',
      } as Resource,
    ],
  },
  async callTool(name, args) {
    if (name === 'pdf.generate') {
      return generatePdfTool(args as Record<string, unknown>);
    }
    throw new Error(`Unknown tool: ${name}`);
  },
  async readResource(uri) {
    if (uri === 'plugin://pdf/latest') {
      return JSON.stringify(latestReport ?? { message: 'no pdf generated yet' });
    }
    throw new Error(`Unknown resource uri: ${uri}`);
  },
};

export { generatePdfsForAllPapers, generatePdfFromHtml, generatePdfForPaper, renderMarkdownToHtml, renderPaperHtml, PdfGenerationOptions, PdfGenerationResult };
export default PdfPlugin;
