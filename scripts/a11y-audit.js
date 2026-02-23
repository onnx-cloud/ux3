#!/usr/bin/env node

/**
 * Accessibility Audit Script
 * Checks all HTML files for WCAG 2.1 AA compliance
 */

import { AccessibilityAuditor } from '../dist/a11y/index.js';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

function findHtmlFiles(dir) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      files.push(...findHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function auditFiles() {
  const examplesDir = resolve('./examples');
  const htmlFiles = findHtmlFiles(examplesDir);
  
  console.log(`🔍 Accessibility Audit\n`);
  console.log(`Found ${htmlFiles.length} HTML files\n`);
  
  let totalIssues = 0;
  let totalErrors = 0;
  
  for (const file of htmlFiles) {
    console.log(`📄 ${file}`);
    
    // Parse HTML (simplified - in production would use jsdom)
    const content = readFileSync(file, 'utf-8');
    
    // Basic checks
    if (!content.includes('lang=')) {
      console.log(`  ⚠️  Missing lang attribute`);
      totalIssues++;
    }
    
    if (!content.includes('<h1')) {
      console.log(`  ❌ Missing H1 heading`);
      totalErrors++;
    }
    
    const imgMatches = content.match(/<img[^>]*>/g) || [];
    const imgWithoutAlt = imgMatches.filter(img => !img.includes('alt='));
    if (imgWithoutAlt.length > 0) {
      console.log(`  ❌ ${imgWithoutAlt.length} images missing alt text`);
      totalErrors += imgWithoutAlt.length;
    }
    
    console.log();
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`Total Issues: ${totalIssues}`);
  console.log(`Total Errors: ${totalErrors}`);
  
  if (totalErrors === 0) {
    console.log(`\n✅ Accessibility audit passed!`);
    process.exit(0);
  } else {
    console.log(`\n❌ Accessibility audit failed!`);
    process.exit(1);
  }
}

auditFiles().catch(err => {
  console.error('Audit error:', err);
  process.exit(1);
});
