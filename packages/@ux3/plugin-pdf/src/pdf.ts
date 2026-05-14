import { JSDOM } from 'jsdom';
import { existsSync } from 'fs';
import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import { basename, dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseSlimdown } from '../../../../src/build/slimdown.js';
import { renderTemplateString } from '../../../../src/ui/template-stamp.js';
import { parse as parseMathExpression, renderHtml as renderMathHtml } from '../../../../packages/@ux3/plugin-math/src/index.js';

export interface PdfGenerationOptions {
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  layoutDir?: string;
}

export interface PdfGenerationResult {
  paperName: string;
  paperDir: string;
  outputPath: string;
  outputRelativePath: string;
  bytes: number;
  generatedAt: string;
}

const DEFAULT_MARGIN = { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeOutputName(name: string): string {
  if (!name.toLowerCase().endsWith('.pdf')) {
    return `${name}.pdf`;
  }
  return name;
}

function normalizePaperSource(source: string): string {
  return source
    .replace(/^```mermaid\b/gm, '```application/x-mermaid')
}

const diagramUtilsPromise = import('../../../../packages/@ux3/ux-diagrams/src/diagram-utils.ts');

async function loadDiagramUtils(): Promise<{ renderDiagramSource: (source: string) => { fragment: DocumentFragment } }> {
  const diagramModule = await diagramUtilsPromise;
  const exported = (diagramModule as any).renderDiagramSource
    ? diagramModule
    : (diagramModule as any).default;

  if (!exported || typeof exported.renderDiagramSource !== 'function') {
    throw new Error('Unable to load renderDiagramSource from ux-diagrams module.');
  }

  return exported as { renderDiagramSource: (source: string) => { fragment: DocumentFragment } };
}

async function renderMermaidDiagrams(container: HTMLElement): Promise<void> {
  const mermaidDivs = Array.from(container.querySelectorAll('div.ux3-mermaid')) as HTMLDivElement[];
  if (mermaidDivs.length === 0) return;

  const { renderDiagramSource } = await loadDiagramUtils();
  for (const div of mermaidDivs) {
    const source = div.getAttribute('data-mermaid') || '';
    const { fragment } = renderDiagramSource(source);
    const wrapper = document.createElement('div');
    wrapper.className = 'diagram-block';
    wrapper.appendChild(fragment.cloneNode(true));
    div.replaceWith(wrapper);
  }
}

function renderMathBlocks(container: HTMLElement): void {
  const codeBlocks = Array.from(container.querySelectorAll('pre > code.language-math, pre > code.language-latex')) as HTMLPreElement[];
  for (const code of codeBlocks) {
    const source = code.textContent || '';
    const mathHtml = renderMathHtml(parseMathExpression(source));
    const wrapper = document.createElement('div');
    wrapper.className = 'math-block';
    wrapper.innerHTML = mathHtml;
    code.parentElement?.replaceWith(wrapper);
  }
}

const pluginRoot = resolve(process.cwd(), 'packages', '@ux3', 'plugin-pdf');

function resolveLayoutBaseDirs(layoutDir?: string): string[] {
  const dirs: string[] = [];
  if (layoutDir) {
    dirs.push(resolve(process.cwd(), layoutDir));
  }

  dirs.push(resolve(process.cwd(), 'ux', 'layout'));
  dirs.push(resolve(pluginRoot, 'layouts'));
  return dirs;
}

function getProjectLayoutPath(layoutName: string, layoutDir?: string): string | null {
  for (const base of resolveLayoutBaseDirs(layoutDir)) {
    const candidateA = resolve(base, `${layoutName}.html`);
    const candidateB = resolve(base, layoutName, '_.html');
    const defaultLayout = resolve(base, '_.html');
    if (existsSync(candidateA)) return candidateA;
    if (existsSync(candidateB)) return candidateB;
    if (existsSync(defaultLayout)) return defaultLayout;
  }
  return null;
}

function injectChapterContent(template: string, html: string): string {
  return template
    .replace(/\{\{\{\s*content\s*\}\}\}/g, html)
    .replace(/\{\{\s*>\s*layout\s*\}\}/g, html)
    .replace(/\{\{\s*site\.template\s*\}\}/g, html);
}

async function renderChapterSection(
  html: string,
  frontmatter: Record<string, unknown>,
  chapterFileName: string,
  layoutDir?: string
): Promise<string> {
  const layoutName = frontmatter.layout ? String(frontmatter.layout) : '';
  const sectionClass = ['chapter', layoutName ? `chapter-layout-${layoutName.replace(/[^a-z0-9_-]/gi, '-')}` : ''].filter(Boolean).join(' ');
  let chapterHtml = html;

  const layoutPath = layoutName ? getProjectLayoutPath(layoutName, layoutDir) : null;
  if (layoutName && layoutPath) {
    const rawLayout = await readFile(layoutPath, 'utf8');
    chapterHtml = injectChapterContent(rawLayout, html);
    chapterHtml = renderTemplateString(chapterHtml, {
      frontmatter,
      title: frontmatter.title ?? '',
      layout: layoutName,
      chapter: frontmatter.chapter ?? '',
      fileName: chapterFileName,
    });
  }

  const sectionTitle = !layoutPath && frontmatter.title ? `<h2>${escapeHtml(String(frontmatter.title))}</h2>` : '';
  return `<section class="${sectionClass}" data-layout="${escapeHtml(layoutName)}" data-chapter="${escapeHtml(String(frontmatter.chapter ?? ''))}">
    ${sectionTitle}
    ${chapterHtml}
  </section>`;
}

export async function renderMarkdownToHtml(source: string): Promise<string> {
  const normalized = normalizePaperSource(source);
  const { html } = parseSlimdown(normalized, { strictMode: false, sanitizationLevel: 'moderate' });
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const { window } = dom;
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousSVGElement = globalThis.SVGElement;
  globalThis.document = window.document;
  globalThis.window = window;
  globalThis.SVGElement = window.SVGElement;

  try {
    const container = document.createElement('div');
    container.innerHTML = html;
    await renderMermaidDiagrams(container);
    renderMathBlocks(container);
    return container.innerHTML;
  } finally {
    if (previousDocument === undefined) delete (globalThis as any).document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete (globalThis as any).window;
    else globalThis.window = previousWindow;
    if (previousSVGElement === undefined) delete (globalThis as any).SVGElement;
    else globalThis.SVGElement = previousSVGElement;
  }
}

export function renderPaperHtml(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 1.5rem;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
      color: #111;
      background: #fff;
    }
    article {
      max-width: 940px;
      margin: 0 auto;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #111;
      page-break-after: avoid;
    }
    h1 { font-size: 2.25rem; margin-top: 1.5rem; }
    h2 { font-size: 1.75rem; margin-top: 1.4rem; }
    p { margin: 1rem 0; }
    blockquote {
      margin: 1.25rem 0;
      padding-left: 1rem;
      border-left: 0.3rem solid #ddd;
      color: #444;
    }
    pre {
      background: #f5f5f5;
      border-radius: 0.5rem;
      padding: 1rem;
      overflow-x: auto;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      background: #f3f4f6;
      padding: 0.15rem 0.3rem;
      border-radius: 0.35rem;
    }
    .math-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1rem;
      margin: 1rem 0;
    }
    .math-expression {
      display: inline-flex;
      align-items: center;
      font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
      font-size: 1rem;
      line-height: 1.3;
      vertical-align: middle;
      white-space: nowrap;
    }
    .math-operator,
    .math-symbol,
    .math-relation {
      display: inline-block;
      margin: 0 0.15em;
    }
    .math-fraction {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 0 0.2em;
    }
    .math-fraction::before {
      content: "";
      display: block;
      width: 100%;
      border-top: 1px solid currentColor;
      margin: 0.15em 0;
    }
    .math-numerator,
    .math-denominator {
      display: block;
      text-align: center;
      min-width: 0.8em;
    }
    .math-superscript sup,
    .math-subscript sub {
      font-size: 0.8em;
      line-height: 1;
      vertical-align: super;
    }
    .math-group {
      display: inline-block;
    }
    .chapter {
      page-break-after: always;
      margin: 2rem 0;
      padding: 1rem 0;
    }
    .chapter:last-child {
      page-break-after: auto;
    }
    .chapter-layout-front-page {
      padding-top: 3rem;
      text-align: center;
    }
    .chapter-layout-front-page h2 {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
    }
    .paper-front-page {
      padding: 4rem 2rem 2rem;
      text-align: center;
    }
    .front-page-shell {
      max-width: 720px;
      margin: 0 auto;
      padding: 4rem 2rem;
      border: 1px solid #d1d5db;
      border-radius: 1rem;
      background: #ffffff;
    }
    .paper-front-page h1 {
      font-size: 3rem;
      letter-spacing: -0.05em;
      margin-bottom: 1rem;
    }
    .paper-subtitle,
    .paper-author,
    .paper-affiliation {
      margin: 0.5rem 0;
      color: #555;
      font-size: 1rem;
    }
    .paper-subtitle {
      font-weight: 600;
    }
    .diagram-block {
      margin: 1rem 0;
      padding: 1rem;
      border: 1px solid #d1d5db;
      border-radius: 0.75rem;
      background: #ffffff;
    }
    .diagram-block svg {
      width: 100%;
      height: auto;
      display: block;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1rem 0;
    }
    table th, table td {
      border: 1px solid #ddd;
      padding: 0.65rem 0.85rem;
    }
    table th {
      background: #f7f7f7;
      text-align: left;
    }
    img {
      max-width: 100%;
      margin: 1rem 0;
    }
    footer {
      margin-top: 3rem;
      color: #666;
      font-size: 0.95rem;
    }
  </style>
</head>
<body>
  <article>
    ${bodyHtml}
  </article>
</body>
</html>`;
}

async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function generatePdfFromHtml(
  html: string,
  outputPath: string,
  options: PdfGenerationOptions = {}
): Promise<PdfGenerationResult> {
  const { chromium } = await import('playwright');
  const pdfOptions = {
    format: options.format || 'A4',
    printBackground: true,
    margin: {
      top: options.margin?.top || DEFAULT_MARGIN.top,
      bottom: options.margin?.bottom || DEFAULT_MARGIN.bottom,
      left: options.margin?.left || DEFAULT_MARGIN.left,
      right: options.margin?.right || DEFAULT_MARGIN.right,
    },
  };

  const outputDir = dirname(outputPath);
  await ensureDirectory(outputDir);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const buffer = await page.pdf(pdfOptions);
    await writeFile(outputPath, buffer);
    return {
      paperName: basename(outputPath, '.pdf'),
      paperDir: outputDir,
      outputPath,
      outputRelativePath: relative(process.cwd(), outputPath),
      bytes: buffer.length,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    await browser.close();
  }
}

export async function getPaperMarkdownFiles(paperDir: string): Promise<string[]> {
  const entries = await readdir(paperDir);
  return entries.filter((file) => file.endsWith('.md'));
}

export async function generatePdfForPaper(
  paperName: string,
  paperDir: string,
  outputRoot: string,
  options: PdfGenerationOptions = {}
): Promise<PdfGenerationResult> {
  const files = await getPaperMarkdownFiles(paperDir);
  const markdownFiles = files
    .filter((file) => file !== 'README.md')
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const orderedFiles = markdownFiles.includes('TOC.md')
    ? ['TOC.md', ...markdownFiles.filter((file) => file !== 'TOC.md')]
    : markdownFiles;

  const chapters = await Promise.all(
    orderedFiles.map(async (file) => {
      const source = await readFile(join(paperDir, file), 'utf8');
      const { frontmatter } = parseSlimdown(normalizePaperSource(source), { strictMode: false, sanitizationLevel: 'moderate' });
      const html = await renderMarkdownToHtml(source);
      return { html, frontmatter, fileName: file };
    })
  );

  const bodyHtml = (await Promise.all(
    chapters.map((chapter) => renderChapterSection(chapter.html, chapter.frontmatter, chapter.fileName, options.layoutDir))
  )).join('\n\n');
  const html = renderPaperHtml(paperName, bodyHtml);
  const outputPath = join(outputRoot, `${paperName}.pdf`);
  return generatePdfFromHtml(html, outputPath, options);
}

export async function generatePdfsForAllPapers(
  papersDir: string,
  outputRoot: string,
  options: PdfGenerationOptions = {}
): Promise<PdfGenerationResult[]> {
  const entries = await readdir(papersDir, { withFileTypes: true });
  const paperDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const results: PdfGenerationResult[] = [];

  for (const paperName of paperDirs) {
    const paperPath = resolve(papersDir, paperName);
    const result = await generatePdfForPaper(paperName, paperPath, outputRoot, options);
    results.push(result);
  }

  return results;
}
