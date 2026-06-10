/**
 * check-demo-evidence-hygiene.mjs
 *
 * Conservative hygiene guard for the live-verification evidence folder
 * (docs/demo/live-verification). It scans GIT-TRACKED files in that folder for:
 *   - disallowed raw screenshot / document extensions (.png/.jpg/.jpeg/.webp/.pdf)
 *   - obvious secrets (client secret, access/refresh tokens, Authorization bearer)
 *   - non-placeholder email addresses
 *
 * Known template docs are allow-listed for the secret/email scan (so the redaction
 * guidance itself doesn't trip the guard); they are still checked for bad extensions.
 *
 * Run: node scripts/check-demo-evidence-hygiene.mjs   (npm run security:demo-evidence)
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { extname, basename } from "path";

const DIR = "docs/demo/live-verification";

const RAW_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".pdf"]);

// Template docs may legitimately mention the words "token"/"secret" as guidance.
const SECRET_SCAN_ALLOWLIST = new Set([
  "README.md",
  "live-provider-results.template.md",
  "live-provider-checklist.md",
  ".gitkeep",
]);

// Placeholder domains that are safe to appear in sanitized docs.
const PLACEHOLDER_DOMAINS = ["example.com", "example.org", "example.net"];

const SECRET_PATTERNS = [
  { name: "client_secret", re: /client[_-]?secret/i },
  { name: "access_token", re: /access[_-]?token/i },
  { name: "refresh_token", re: /refresh[_-]?token/i },
  { name: "bearer token", re: /Authorization:\s*Bearer\s+\S+/i },
];

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

function trackedFiles() {
  try {
    const out = execSync(`git ls-files ${DIR}`, { encoding: "utf-8" });
    return out.trim().split("\n").filter((f) => f.length > 0);
  } catch {
    return [];
  }
}

function isTextFile(file) {
  return [".md", ".json", ".txt", ".gitkeep"].includes(extname(file) || basename(file));
}

function main() {
  const files = trackedFiles();
  const violations = [];

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    const name = basename(file);

    if (RAW_EXTENSIONS.has(ext)) {
      violations.push({ file, issue: `raw screenshot/document committed (${ext})` });
      continue;
    }

    if (!isTextFile(file)) continue;
    if (SECRET_SCAN_ALLOWLIST.has(name)) continue;

    let content = "";
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue;
    }

    for (const { name: label, re } of SECRET_PATTERNS) {
      if (re.test(content)) violations.push({ file, issue: `possible secret: ${label}` });
    }

    const emails = content.match(EMAIL_RE) || [];
    for (const email of emails) {
      const domain = email.split("@")[1]?.toLowerCase() || "";
      const placeholder = PLACEHOLDER_DOMAINS.some((d) => domain.endsWith(d));
      const redacted = email.includes("*");
      if (!placeholder && !redacted) {
        violations.push({ file, issue: `non-placeholder email address: ${email}` });
      }
    }
  }

  console.log("Demo Evidence Hygiene Check");
  console.log("=".repeat(60));
  console.log(`Scanned ${files.length} tracked file(s) under ${DIR}/`);

  if (violations.length === 0) {
    console.log("\n✅ PASS — no raw screenshots or obvious secrets in tracked evidence.");
    process.exit(0);
  }

  console.error(`\n❌ FAIL — ${violations.length} issue(s):`);
  for (const v of violations) console.error(`  ${v.file}: ${v.issue}`);
  console.error("\nRedact and remove private data before committing. See docs/demo/live-verification/README.md.");
  process.exit(1);
}

main();
