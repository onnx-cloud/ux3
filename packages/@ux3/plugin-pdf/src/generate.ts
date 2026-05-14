import { join, resolve, dirname } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { generatePdfsForAllPapers, PdfGenerationResult } from './pdf.ts';

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (const token of argv) {
    const [key, value] = token.split('=');
    if (key.startsWith('--')) {
      args[key.slice(2)] = value ?? '';
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const papersDir = resolve(process.cwd(), args.papersDir || 'papers');
  const outputDir = resolve(process.cwd(), args.outputDir || 'papers');
  const reportPath = resolve(process.cwd(), args.reportPath || 'reports/papers-pdf-report.json');

  const results: PdfGenerationResult[] = await generatePdfsForAllPapers(papersDir, outputDir);
  const report = {
    generatedAt: new Date().toISOString(),
    papersDir,
    outputDir,
    papers: results.map((result) => ({
      paperName: result.paperName,
      outputPath: result.outputPath,
      bytes: result.bytes,
      generatedAt: result.generatedAt,
    })),
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(`Generated ${results.length} paper PDF(s).`);
  for (const result of results) {
    console.log(`- ${result.paperName}: ${result.outputPath} (${result.bytes} bytes)`);
  }
}

main().catch((error) => {
  console.error('Failed to generate paper PDFs:', error);
  process.exit(1);
});
