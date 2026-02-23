import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';

async function loadSchemas(rootDir: string) {
  const schemasDir = path.join(rootDir, 'schema');
  const schemaFiles = ['routes', 'services', 'i18n', 'style', 'tokens', 'validate', 'view'];
  const schemas: Record<string, any> = {};

  for (const name of schemaFiles) {
    const p = path.join(rootDir, 'schema', `${name}.schema.json`);
    try {
      const content = await fs.readFile(p, 'utf-8');
      schemas[name] = JSON.parse(content);
    } catch (e) {
      // ignore missing schemas
    }
  }

  return schemas;
}

async function loadUxConfig(projectDir: string) {
  const confPath = path.join(projectDir, 'ux', 'ux3.yaml');
  try {
    const content = await fs.readFile(confPath, 'utf-8');
    return YAML.parse(content);
  } catch (e) {
    return null;
  }
}

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
}

async function run() {
  const repoRoot = process.cwd();
  const projectDir = path.join(repoRoot, 'examples', 'iam');
  const reportDir = path.join(repoRoot, 'reports', 'lint');
  await ensureDir(reportDir);

  const reportPath = path.join(reportDir, 'iam.json');
  const report: any = {
    timestamp: new Date().toISOString(),
    project: 'examples/iam',
    uxConfig: null,
    validation: null,
    compile: null,
  };

  // Load UX config
  report.uxConfig = await loadUxConfig(projectDir);

  // Load schemas
  const schemas = await loadSchemas(repoRoot);

  // Run Validator
  try {
    const { Validator } = await import('../src/build/validator.js');
    const validator = new Validator({ projectDir, schemas });
    const validation = await validator.validate();
    report.validation = validation;
  } catch (e) {
    report.validation = { valid: false, errors: [{ file: projectDir, message: `Validator failed: ${e instanceof Error ? e.message : String(e)}` }] };
  }

  // Attempt to compile views (sanity check)
  try {
    const { ViewCompiler } = await import('../src/build/view-compiler.js');
    const vc = new ViewCompiler(path.join(projectDir, 'ux', 'view'), path.join(projectDir, 'generated', 'views'));
    try {
      await vc.compileAllViews();
      report.compile = { success: true };
    } catch (compileErr) {
      report.compile = { success: false, message: compileErr instanceof Error ? compileErr.message : String(compileErr) };
    }
  } catch (e) {
    report.compile = { success: false, message: `ViewCompiler import failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  // Write structured report
  try {
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`Report written: ${reportPath}`);
  } catch (e) {
    console.error('Failed to write report:', e);
  }

  // Print summary
  const hasErrors = (report.validation?.errors || []).length > 0 || report.compile?.success === false;

  console.log('=== LINT: IAM SUMMARY ===');
  console.log(`UX config: ${report.uxConfig ? 'found' : 'missing'}`);
  console.log(`Validation: ${report.validation?.valid ? 'valid' : 'invalid'}`);
  console.log(`Errors: ${(report.validation?.errors || []).length}`);
  console.log(`Warnings: ${(report.validation?.warnings || []).length || 0}`);
  console.log(`Compile: ${report.compile?.success ? 'ok' : 'failed'}`);

  if (hasErrors) {
    console.error('Lint failed — see report for details');
    process.exit(1);
  }

  console.log('Lint success');
  process.exit(0);
}

run().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(2);
});
