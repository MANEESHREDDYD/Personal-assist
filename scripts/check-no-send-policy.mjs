/**
 * check-no-send-policy.mjs
 *
 * Static guard for Personal Assist's no-send policy (Phase 3H/3H.1).
 *
 * Scans application source (src/ only) for provider "send" endpoint strings that
 * must never appear in the codebase. Personal Assist creates provider-side drafts
 * only — it never sends email. This script fails CI/commits if a forbidden token
 * is reintroduced into source.
 *
 * Scope:
 *   - scans only src/
 *   - ignores docs/ and README (those legitimately reference forbidden endpoints)
 *
 * Usage: node scripts/check-no-send-policy.mjs   (npm run security:no-send)
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const SCAN_DIR = "src";
const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

// Forbidden provider send-endpoint tokens. None of these may appear in src/.
const FORBIDDEN_TOKENS = [
  "users.drafts.send",
  "users.messages.send",
  "drafts.send",
  "messages.send",
  "sendMail",
  "/send",
];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      files.push(...walk(full));
    } else if (SCAN_EXTENSIONS.has(extname(full))) {
      files.push(full);
    }
  }
  return files;
}

function main() {
  const files = walk(SCAN_DIR);
  const violations = [];

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const token of FORBIDDEN_TOKENS) {
        if (line.includes(token)) {
          violations.push({ file, line: i + 1, token, text: line.trim() });
        }
      }
    });
  }

  console.log("No-Send Policy Check");
  console.log("=".repeat(60));
  console.log(`Scanned ${files.length} source files under ${SCAN_DIR}/`);
  console.log(`Forbidden tokens: ${FORBIDDEN_TOKENS.join(", ")}`);
  console.log("");

  if (violations.length === 0) {
    console.log("✅ PASS — no forbidden provider send endpoints found in source.");
    process.exit(0);
  }

  console.error(`❌ FAIL — ${violations.length} forbidden reference(s) found:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.token}]`);
    console.error(`    ${v.text}`);
  }
  console.error("\nPersonal Assist must never call provider send endpoints.");
  console.error("See docs/security/no-send-policy.md.");
  process.exit(1);
}

main();
