/**
 * Tailwind CSS build-time bundler.
 *
 * Generates a Tailwind CSS bundle from the project's templates, style YAML
 * definitions, and framework default styles — eliminating the runtime CDN.
 */
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

export interface TailwindBundlerOptions {
  projectRoot: string;
  outputPath: string;
  frameworkRoot?: string;
  log?: (msg: string) => void;
}

export async function bundleTailwindCss(opts: TailwindBundlerOptions): Promise<string> {
  const log = opts.log ?? (() => {});
  const projectRoot = path.resolve(opts.projectRoot);
  const frameworkRoot = path.resolve(opts.frameworkRoot ?? path.join(projectRoot, '..', '..'));

  const tmpDir = path.join(projectRoot, '.ux3-tmp');
  fs.mkdirSync(tmpDir, { recursive: true });

  // Collect all explicit Tailwind classes from YAML style definitions.
  // These map to ux-style keys and are NOT in HTML class attributes at build time.
  const styleClasses = new Set<string>();
  const styleGlobs = [path.join(projectRoot, 'ux', 'style', '**', '*.yaml')];
  for (const pattern of styleGlobs) {
    const files = globSync(pattern, { nodir: true, absolute: true });
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const baseVals = content.matchAll(/base:\s*"([^"]+)"/gi);
        for (const m of baseVals) styleClasses.add(m[1]);
      } catch { /* skip */ }
    }
  }

  // Also add classes from framework default-styles.ts
  const defaultStylesPath = path.join(frameworkRoot, 'src', 'build', 'default-styles.ts');
  try {
    const content = fs.readFileSync(defaultStylesPath, 'utf-8');
    const tsStrings = content.matchAll(/'([^']+)'/g);
    for (const m of tsStrings) styleClasses.add(m[1]);
  } catch { /* skip */ }

  log(`Collected ${styleClasses.size} style-definition class strings`);

  // Write a temp HTML snippet with the style-definition classes split into
  // individual class attributes (one per line) so Tailwind's content scanner
  // discovers them reliably.
  const snippetLines: string[] = [];
  for (const cls of styleClasses) {
    snippetLines.push(`<div class="${cls}"></div>`);
  }
  const snippetPath = path.join(tmpDir, 'style-classes.html');
  fs.writeFileSync(snippetPath, snippetLines.join('\n'), 'utf-8');

  const frameworkUiSrc = path.join(frameworkRoot, 'src', 'ui');

  const configPath = path.join(tmpDir, 'tailwind.config.cjs');
  const configContent = `module.exports = {
  darkMode: 'class',
  content: [
    ${JSON.stringify(snippetPath)},
    ${JSON.stringify(path.join(projectRoot, 'ux', '**', '*.html'))},
    ${JSON.stringify(path.join(projectRoot, 'ux', '**', '*.ts'))},
    ${JSON.stringify(path.join(frameworkRoot, 'src', 'build', '*.ts'))},
    ${JSON.stringify(path.join(frameworkUiSrc, '**', '*.ts'))},
    ${JSON.stringify(path.join(frameworkUiSrc, '**', '*.html'))},
  ],
  safelist: [],
  theme: {
    extend: {},
  },
  plugins: [],
};`;
  fs.writeFileSync(configPath, configContent, 'utf-8');

  log('Running Tailwind CSS build...');
  try {
    const [postcssMod, tailwindcssMod] = await Promise.all([
      import('postcss'),
      import('tailwindcss'),
    ]);
    const postcss = postcssMod.default;
    const tailwindcss = tailwindcssMod.default;

    const source = '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n';
    const result = await postcss([
      tailwindcss({ config: configPath }),
    ] as any).process(source, { from: undefined });

    const outputDir = path.dirname(opts.outputPath);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(opts.outputPath, result.css, 'utf-8');

    log(`Tailwind CSS bundled: ${opts.outputPath} (${(result.css.length / 1024).toFixed(1)} KB)`);
    try { fs.rmSync(tmpDir, { recursive: true }); } catch { /* ok */ }
    return opts.outputPath;
  } catch (err) {
    log(`Tailwind build failed: ${String(err).slice(0, 120)}. Falling back to CDN.`);
    try { fs.rmSync(tmpDir, { recursive: true }); } catch { /* ok */ }
    throw err;
  }
}
