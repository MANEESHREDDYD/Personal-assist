/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * language-breakdown.mjs
 * 
 * Estimates repository language distribution by counting bytes of tracked source files.
 * This provides a local approximation of what GitHub Linguist reports.
 * 
 * Usage: node scripts/language-breakdown.mjs
 */

import { execSync } from 'child_process';
import { readFileSync, statSync } from 'fs';
import { extname } from 'path';

const EXTENSION_MAP = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.py': 'Python',
  '.sql': 'SQL',
  '.css': 'CSS',
  '.md': 'Markdown',
};

const EXCLUDED_PATTERNS = [
  'node_modules',
  '.next',
  'data/uploads',
  'data/analytics',
  'package-lock.json',
  '.git',
  '.env',
];

function getTrackedFiles() {
  const output = execSync('git ls-files', { encoding: 'utf-8' });
  return output.trim().split('\n').filter(f => f.length > 0);
}

function shouldExclude(filePath) {
  return EXCLUDED_PATTERNS.some(p => filePath.includes(p));
}

function main() {
  const files = getTrackedFiles();
  const langBytes = {};
  let totalBytes = 0;

  for (const file of files) {
    if (shouldExclude(file)) continue;
    const ext = extname(file);
    const lang = EXTENSION_MAP[ext];
    if (!lang) continue;

    try {
      const stats = statSync(file);
      const bytes = stats.size;
      langBytes[lang] = (langBytes[lang] || 0) + bytes;
      totalBytes += bytes;
    } catch (e) {
      // File may not exist locally (gitignored generated file)
    }
  }

  console.log('\n📊 Repository Language Breakdown (by bytes of tracked source files)');
  console.log('=' .repeat(65));

  const sorted = Object.entries(langBytes).sort(([, a], [, b]) => b - a);
  for (const [lang, bytes] of sorted) {
    const pct = ((bytes / totalBytes) * 100).toFixed(1);
    const kb = (bytes / 1024).toFixed(1);
    const bar = '█'.repeat(Math.round(pct / 2));
    console.log(`  ${lang.padEnd(12)} ${pct.padStart(5)}%  ${kb.padStart(7)} KB  ${bar}`);
  }

  console.log('=' .repeat(65));
  console.log(`  Total tracked source: ${(totalBytes / 1024).toFixed(1)} KB`);
  console.log('\nNote: This is an approximation. GitHub uses Linguist which may differ.');
  console.log('      Markdown is excluded from GitHub language stats by default.\n');
}

main();
