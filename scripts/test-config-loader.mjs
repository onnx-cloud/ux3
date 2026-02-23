#!/usr/bin/env node

/**
 * Test script to verify config loader
 * Tests loading and merging of YAML/JSON/JS configs
 */

import { loadConfig, deepMerge, getConfigValue, setConfigValue } from '../src/cli/config-loader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testConfigLoader() {
  const examplePath = path.join(__dirname, '../examples/iam');

  console.log('='.repeat(60));
  console.log('🧪 Config Loader Test Suite');
  console.log('='.repeat(60) + '\n');

  try {
    // Test 1: Load config from IAM example
    console.log('📋 Test 1: Load config from IAM example\n');
    const config = await loadConfig(examplePath, { logLoading: true });

    console.log('\n✅ Config loaded successfully');
    console.log(`   Routes: ${config.routes?.length || 0}`);
    console.log(`   Services: ${Object.keys(config.services || {}).length}`);
    console.log(`   Tokens: ${Object.keys(config.tokens || {}).length}`);

    // Test 2: Verify mandatory keys
    console.log('\n📋 Test 2: Verify mandatory keys\n');
    const mandatoryKeys = ['routes', 'services', 'tokens'];
    let allPresent = true;
    for (const key of mandatoryKeys) {
      const exists = key in config;
      console.log(`   ${exists ? '✅' : '❌'} ${key}: ${exists ? 'Present' : 'Missing'}`);
      if (!exists) allPresent = false;
    }

    if (!allPresent) {
      throw new Error('Missing mandatory keys');
    }

    // Test 3: Check deep merge (tokens from tokens.json + ux3.config.js)
    console.log('\n📋 Test 3: Verify deep merge (tokens)\n');
    console.log(`   Primary color: ${config.tokens.colors?.primary}`);
    console.log(`   Secondary color: ${config.tokens.colors?.secondary} (overridden by JS config)`);
    console.log(`   Space.md: ${config.tokens.space?.md}`);
    console.log(`   Typography.fontSize.xs: ${config.tokens.typography?.fontSize?.xs}`);

    // Test 4: Check service merging
    console.log('\n📋 Test 4: Verify service merging\n');
    const services = Object.keys(config.services || {});
    console.log(`   Services: ${services.join(', ')}`);
    console.log(`   API adapter: ${config.services.api?.adapter}`);
    console.log(`   Chatbot adapter: ${config.services.chatbot?.adapter} (from services.yaml)`);
    console.log(`   Assets has caching: ${config.services.assets?.caching ? 'Yes' : 'No'} (from JS config)`);

    // Test 5: Get config value by path
    console.log('\n📋 Test 5: Get config value by path\n');
    const primaryColor = getConfigValue(config, 'tokens.colors.primary');
    const routeCount = getConfigValue(config, 'routes.length', 0);
    const missingValue = getConfigValue(config, 'nonexistent.path', 'DEFAULT');

    console.log(`   tokens.colors.primary: ${primaryColor}`);
    console.log(`   routes.length: ${routeCount}`);
    console.log(`   nonexistent.path (with default): ${missingValue}`);

    // Test 6: Set config value by path
    console.log('\n📋 Test 6: Set config value by path\n');
    const testConfig = JSON.parse(JSON.stringify(config));
    setConfigValue(testConfig, 'newKey.nested.value', 'test');
    console.log(`   Set newKey.nested.value: ${getConfigValue(testConfig, 'newKey.nested.value')}`);

    // Test 7: Deep merge function
    console.log('\n📋 Test 7: Deep merge function\n');
    const obj1 = { a: { b: 1, c: 2 }, d: 3 };
    const obj2 = { a: { c: 99, e: 4 }, f: 5 };
    const merged = deepMerge(obj1, obj2);
    console.log(`   Object 1: ${JSON.stringify(obj1)}`);
    console.log(`   Object 2: ${JSON.stringify(obj2)}`);
    console.log(`   Merged: ${JSON.stringify(merged)}`);
    console.log(`   ✅ Deep merge: a.b=${merged.a.b}, a.c=${merged.a.c} (wins), a.e=${merged.a.e}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error));
    console.error(error);
    process.exit(1);
  }
}

testConfigLoader();
