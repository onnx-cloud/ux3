#!/usr/bin/env node
import YAML from 'yaml';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { dirname, extname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const papersDir = join(rootDir, 'papers');
const reportsDir = join(rootDir, 'reports');
const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 8)}`;

const rootArtifacts = [
  'generated/build-manifest.json',
  'test-results/vitest/results.json',
  'test-results/playwright/results.json',
  'test-results/playwright/results.xml',
  'reports/papers-pdf-report.json',
];

const defaultRootCommands = [
  { label: 'build', command: 'npm run build' },
  { label: 'vitest', command: 'npm run test -- --reporter=json --outputFile=test-results/vitest/results.json' },
  { label: 'playwright', command: 'npm run test:e2e' },
];

function log(message) {
  process.stdout.write(`${message}\n`);
}

function runCommand(command) {
  try {
    execSync(command, { cwd: rootDir, stdio: 'inherit', shell: true });
    return { success: true };
  } catch (error) {
    log(`⚠️  Command failed: ${command}`);
    return { success: false, error };
  }
}

function loadJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function loadYaml(filePath) {
  try {
    return YAML.parse(readFileSync(filePath, 'utf8')) || {};
  } catch {
    return null;
  }
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\s*([\s\S]*?)\s*---/);
  if (!match) return null;
  try {
    return YAML.parse(match[1]);
  } catch {
    return null;
  }
}

function loadPaperSpecs() {
  if (!existsSync(papersDir)) return [];

  return readdirSync(papersDir)
    .filter((name) => statSync(join(papersDir, name)).isDirectory())
    .map((name) => {
      const paperDir = join(papersDir, name);
      const yamlPath = ['experiments.yaml', 'experiments.yml'].map((file) => join(paperDir, file)).find(existsSync);
      const mdPath = ['experiments.md', 'experiments.MD'].map((file) => join(paperDir, file)).find(existsSync);
      let config = null;
      let specPath = null;

      if (yamlPath) {
        config = loadYaml(yamlPath);
        specPath = relative(rootDir, yamlPath);
      } else if (mdPath) {
        const markdown = readFileSync(mdPath, 'utf8');
        config = parseFrontmatter(markdown);
        specPath = relative(rootDir, mdPath);
      }

      return {
        name,
        title: config?.title ?? name,
        description: config?.description ?? `Researcher config for ${name}`,
        categories: Array.isArray(config?.categories) ? config.categories : [name],
        pluginEvidence: Array.isArray(config?.pluginEvidence) ? config.pluginEvidence : [],
        commands: Array.isArray(config?.commands) ? config.commands : [],
        artifacts: Array.isArray(config?.artifacts) ? config.artifacts : [],
        specPath,
      };
    });
}

function gatherArtifacts(paths) {
  const uniquePaths = Array.from(new Set(paths.map((p) => p.replace(/\\/g, '/'))));
  const summary = {};

  uniquePaths.forEach((relativePath) => {
    const fullPath = join(rootDir, relativePath);
    summary[relativePath] = {
      path: fullPath,
      exists: existsSync(fullPath),
      relativePath,
      data: existsSync(fullPath) ? loadJson(fullPath) : null,
    };
  });

  return summary;
}

function computeTestSummary(fileData) {
  if (!fileData) return { passed: 0, failed: 0, skipped: 0, summary: 'No results' };

  if (typeof fileData.numPassedTests === 'number' || typeof fileData.numFailedTests === 'number') {
    const passed = fileData.numPassedTests ?? 0;
    const failed = fileData.numFailedTests ?? 0;
    const skipped = fileData.numPendingTests ?? fileData.numSkippedTests ?? 0;
    return {
      passed,
      failed,
      skipped,
      summary: `${passed} passed, ${failed} failed, ${skipped} skipped`,
    };
  }

  if (fileData.stats) {
    return {
      passed: fileData.stats.passed ?? 0,
      failed: fileData.stats.failed ?? 0,
      skipped: fileData.stats.skipped ?? 0,
      summary: `${fileData.stats.passed ?? 0} passed, ${fileData.stats.failed ?? 0} failed, ${fileData.stats.skipped ?? 0} skipped`,
    };
  }

  if (fileData.suites) {
    const all = { passed: 0, failed: 0, skipped: 0 };
    const countSuite = (suite) => {
      if (Array.isArray(suite.tests)) {
        suite.tests.forEach(test => {
          const status = test.status?.toLowerCase?.();
          if (status === 'passed') all.passed += 1;
          if (status === 'failed') all.failed += 1;
          if (status === 'skipped') all.skipped += 1;
        });
      }
      if (Array.isArray(suite.suites)) suite.suites.forEach(countSuite);
    };
    countSuite(fileData.suites);
    return {
      passed: all.passed,
      failed: all.failed,
      skipped: all.skipped,
      summary: `${all.passed} passed, ${all.failed} failed, ${all.skipped} skipped`,
    };
  }

  if (Array.isArray(fileData.testResults)) {
    const all = { passed: 0, failed: 0, skipped: 0 };
    fileData.testResults.forEach(result => {
      if (Array.isArray(result.assertionResults)) {
        result.assertionResults.forEach(test => {
          const status = test.status?.toLowerCase?.();
          if (status === 'passed') all.passed += 1;
          if (status === 'failed') all.failed += 1;
          if (status === 'skipped' || status === 'pending') all.skipped += 1;
        });
      }
    });
    return {
      passed: all.passed,
      failed: all.failed,
      skipped: all.skipped,
      summary: `${all.passed} passed, ${all.failed} failed, ${all.skipped} skipped`,
    };
  }

  return {
    passed: 0,
    failed: 0,
    skipped: 0,
    summary: JSON.stringify(fileData).slice(0, 160),
  };
}

function computeOutcome(findings) {
  if (!Array.isArray(findings) || findings.length === 0) return 'pass';
  if (findings.some((f) => f.severity === 'error')) return 'fail';
  if (findings.some((f) => f.severity === 'warning')) return 'partial';
  return 'pass';
}

function writeJsonFile(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function runRootCommands(skipCommands) {
  return skipCommands
    ? defaultRootCommands.map((step) => ({ ...step, result: { success: false, error: 'skipped' } }))
    : defaultRootCommands.map((step) => ({ ...step, result: runCommand(step.command) }));
}

function getRecursiveSourceFiles(dir, extensions = ['.md', '.yaml', '.yml']) {
  const files = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getRecursiveSourceFiles(fullPath, extensions));
    } else if (extensions.includes(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

function getLatestSourceMtime(sourceDir) {
  const files = getRecursiveSourceFiles(sourceDir);
  let latest = 0;
  for (const file of files) {
    const mtime = statSync(file).mtimeMs;
    if (mtime > latest) latest = mtime;
  }
  return latest;
}

function isPapersPdfUpToDate(reportPath, sourceDir) {
  if (!existsSync(reportPath)) return false;
  const report = loadJson(reportPath);
  if (!report || !Array.isArray(report.papers) || report.papers.length === 0) return false;

  const sourceMtime = getLatestSourceMtime(sourceDir);
  if (sourceMtime === 0) return false;

  for (const paper of report.papers) {
    const outputPath = paper.outputPath;
    if (!outputPath || !existsSync(outputPath)) return false;
    const pdfMtime = statSync(outputPath).mtimeMs;
    if (pdfMtime < sourceMtime) return false;
  }

  return true;
}

function runPaperCommands(spec, skipCommands) {
  if (!Array.isArray(spec.commands) || spec.commands.length === 0) return [];

  return spec.commands.map((command) => {
    const shouldSkipPdf = !skipCommands && typeof command.command === 'string' && command.command.includes('packages/@ux3/plugin-pdf/src/generate.ts');
    if (shouldSkipPdf && isPapersPdfUpToDate(join(rootDir, 'reports', 'papers-pdf-report.json'), papersDir)) {
      log(`⚠️  Skipping up-to-date PDF generation for ${spec.name}.`);
      return {
        label: command.label,
        command: command.command,
        result: { success: true, error: 'skipped' },
      };
    }

    return {
      label: command.label,
      command: command.command,
      result: skipCommands ? { success: false, error: 'skipped' } : runCommand(command.command),
    };
  });
}

function buildRootFindings(artifactSummary, rootCommandResults) {
  const findings = [];

  rootCommandResults.forEach((step) => {
    const skipped = step.result.error === 'skipped';
    findings.push({
      source: 'root-command',
      category: 'root-validation',
      severity: skipped ? 'info' : step.result.success ? 'info' : 'warning',
      message: skipped
        ? `Skipped root command ${step.label}.`
        : step.result.success
        ? `Root command ${step.label} completed successfully.`
        : `Root command ${step.label} failed: ${step.result.error}`,
      path: step.command,
      evidence: {
        command: step.command,
        success: step.result.success,
        error: step.result.error,
      },
    });
  });

  const addArtifactFinding = (path, category, label) => {
    const artifact = artifactSummary[path] || { exists: false, relativePath: path };
    findings.push({
      source: label,
      category,
      severity: artifact.exists ? 'info' : 'warning',
      message: artifact.exists
        ? `${label} artifact is available at ${artifact.relativePath}.`
        : `${label} artifact is missing at ${artifact.relativePath}.`,
      path: artifact.relativePath,
      evidence: { exists: artifact.exists },
    });
  };

  addArtifactFinding('generated/build-manifest.json', 'compile-first-architectures', 'build-manifest');
  addArtifactFinding('test-results/vitest/results.json', 'fsm-driven-reactive-ui', 'vitest-results');
  addArtifactFinding('test-results/playwright/results.json', 'live-agentic-host', 'playwright-results');
  addArtifactFinding('reports/papers-pdf-report.json', 'ai-augmented-ux', 'pdf-report');

  return findings;
}

function buildPaperFindings(spec, artifactSummary, commandResults) {
  const findings = [];
  const paperCategory = spec.categories[0] || spec.name;

  findings.push({
    source: 'paper-spec',
    category: paperCategory,
    severity: 'info',
    message: `Loaded experiment metadata for paper ${spec.name}.`,
    path: spec.specPath || `papers/${spec.name}`,
    evidence: {
      title: spec.title,
      categories: spec.categories,
      pluginEvidence: spec.pluginEvidence,
    },
  });

  (spec.artifacts || []).forEach((artifactPath) => {
    const artifact = artifactSummary[artifactPath] || { exists: false, relativePath: artifactPath };
    findings.push({
      source: 'paper-artifact',
      category: paperCategory,
      severity: artifact.exists ? 'info' : 'warning',
      message: artifact.exists
        ? `Artifact ${artifact.relativePath} is available for paper ${spec.name}.`
        : `Artifact ${artifact.relativePath} is missing for paper ${spec.name}.`,
      path: artifact.relativePath,
      evidence: { exists: artifact.exists },
    });
  });

  (commandResults || []).forEach((command) => {
    const skipped = command.result.error === 'skipped';
    findings.push({
      source: 'paper-command',
      category: paperCategory,
      severity: skipped ? 'info' : command.result.success ? 'info' : 'warning',
      message: skipped
        ? `Skipped paper command ${command.label} for ${spec.name}.`
        : command.result.success
        ? `Paper command ${command.label} for ${spec.name} completed successfully.`
        : `Paper command ${command.label} for ${spec.name} failed: ${command.result.error}`,
      path: command.command,
      evidence: {
        label: command.label,
        command: command.command,
        success: command.result.success,
        error: command.result.error,
      },
    });
  });

  return findings;
}

function buildPaperReport(spec, artifactSummary, commandResults, rootReportSummary) {
  const paperDir = join(papersDir, spec.name, 'findings');
  mkdirSync(paperDir, { recursive: true });
  const findings = buildPaperFindings(spec, artifactSummary, commandResults);
  const outcome = computeOutcome(findings);

  const relativeArtifacts = {};
  (spec.artifacts || []).forEach((artifactPath) => {
    const artifact = artifactSummary[artifactPath];
    relativeArtifacts[artifactPath.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '_')] = artifact && artifact.exists ? relative(paperDir, artifact.path) : null;
  });

  const report = {
    runId,
    commit: rootReportSummary.commit,
    project: rootReportSummary.project,
    timestamp: rootReportSummary.timestamp,
    paper: spec.name,
    title: spec.title,
    categories: spec.categories,
    pluginEvidence: spec.pluginEvidence,
    commands: commandResults,
    artifacts: relativeArtifacts,
    outcome,
    findings,
  };

  writeJsonFile(join(paperDir, 'verified-findings.json'), report);
  return report;
}

function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function getPackageName() {
  try {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
    return pkg.name || 'ux3';
  } catch {
    return 'ux3';
  }
}

function main() {
  const args = process.argv.slice(2);
  const skipCommands = args.includes('--skip-commands') || args.includes('--collect-only');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    log('Usage: node scripts/researcher.mjs [--skip-commands|--collect-only]');
    log('  --skip-commands | --collect-only   Skip running build/test commands and gather available artifacts only.');
    process.exit(0);
  }

  log('🚀 Running UX3 research assistant pipeline...');
  if (skipCommands) {
    log('⚠️  Skipping build/test commands and using existing artifact files only.');
  }

  const paperSpecs = loadPaperSpecs();
  const rootCommandResults = runRootCommands(skipCommands);
  const paperCommandResults = paperSpecs.map((spec) => ({ spec, commands: runPaperCommands(spec, skipCommands) }));

  const allArtifactPaths = Array.from(new Set([...rootArtifacts, ...paperSpecs.flatMap((spec) => spec.artifacts || [])]));
  const artifactSummary = gatherArtifacts(allArtifactPaths);

  const rootFindings = buildRootFindings(artifactSummary, rootCommandResults);
  const rootReport = {
    runId,
    commit: getGitCommit(),
    project: getPackageName(),
    timestamp: new Date().toISOString(),
    outcomes: rootCommandResults.map((step) => ({ step: step.label, success: step.result.success, error: step.result.error })),
    artifacts: rootArtifacts.reduce((acc, path) => ({
      ...acc,
      [path.replace(/\//g, '_')]: artifactSummary[path]?.relativePath ?? null,
    }), {}),
    papers: [],
    findings: rootFindings,
    outcome: computeOutcome(rootFindings),
  };

  mkdirSync(reportsDir, { recursive: true });
  writeJsonFile(join(reportsDir, 'verified-findings.json'), rootReport);

  for (const paperResult of paperCommandResults) {
    const paperReport = buildPaperReport(paperResult.spec, artifactSummary, paperResult.commands, rootReport);
    rootReport.papers.push({
      name: paperResult.spec.name,
      title: paperResult.spec.title,
      outcome: paperReport.outcome,
      artifacts: paperReport.artifacts,
      findings: paperReport.findings.length,
    });
  }

  writeJsonFile(join(reportsDir, 'verified-findings.json'), rootReport);

  log(`✅ Researcher artifacts generated for ${paperSpecs.length} papers.`);
  log(`📄 Root report: ${relative(rootDir, join(reportsDir, 'verified-findings.json'))}`);
  paperSpecs.forEach((spec) => {
    log(`  - ${spec.name}: ${relative(rootDir, join(papersDir, spec.name, 'findings', 'verified-findings.json'))}`);
  });
}

main();
