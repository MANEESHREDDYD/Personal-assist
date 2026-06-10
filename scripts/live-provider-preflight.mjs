import fs from "fs";
import path from "path";

const root = process.cwd();
const envPath = path.join(root, ".env");

function parseEnv(text) {
  const result = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result.set(match[1], value);
  }
  return result;
}

function hasValue(env, key) {
  return Boolean(env.get(key)?.trim());
}

function encryptionKeyStatus(value) {
  if (!value) return "missing";

  try {
    if (Buffer.from(value, "base64").length === 32) return "valid";
  } catch {
    // Fall back to plain string length.
  }

  return Buffer.from(value, "utf8").length === 32 ? "valid" : "invalid_length";
}

function printCheck(label, ok, detail = "") {
  const status = ok ? "OK" : "MISSING";
  console.log(`${status} ${label}${detail ? ` - ${detail}` : ""}`);
}

console.log("Live Provider Environment Preflight");
console.log("Secrets are not printed. This command is informational and exits 0.");
console.log("");

if (!fs.existsSync(envPath)) {
  console.log("MISSING .env - copy .env.example to .env and fill test OAuth credentials.");
  process.exit(0);
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"));
const encryptionStatus = encryptionKeyStatus(env.get("ENCRYPTION_KEY"));

printCheck(".env exists", true);
printCheck("ENCRYPTION_KEY", encryptionStatus === "valid", encryptionStatus);
printCheck("GOOGLE_GMAIL_DRAFT_CLIENT_ID", hasValue(env, "GOOGLE_GMAIL_DRAFT_CLIENT_ID"));
printCheck("GOOGLE_GMAIL_DRAFT_CLIENT_SECRET", hasValue(env, "GOOGLE_GMAIL_DRAFT_CLIENT_SECRET"));
printCheck("GOOGLE_GMAIL_DRAFT_REDIRECT_URI", hasValue(env, "GOOGLE_GMAIL_DRAFT_REDIRECT_URI"));
printCheck("MICROSOFT_CLIENT_ID", hasValue(env, "MICROSOFT_CLIENT_ID"));
printCheck("MICROSOFT_CLIENT_SECRET", hasValue(env, "MICROSOFT_CLIENT_SECRET"));
printCheck(
  "MICROSOFT_OUTLOOK_DRAFT_REDIRECT_URI",
  hasValue(env, "MICROSOFT_OUTLOOK_DRAFT_REDIRECT_URI")
);

const tenantPresent = hasValue(env, "MICROSOFT_TENANT");
printCheck("MICROSOFT_TENANT", true, tenantPresent ? "set" : "default common");

const ready =
  encryptionStatus === "valid" &&
  hasValue(env, "GOOGLE_GMAIL_DRAFT_CLIENT_ID") &&
  hasValue(env, "GOOGLE_GMAIL_DRAFT_CLIENT_SECRET") &&
  hasValue(env, "GOOGLE_GMAIL_DRAFT_REDIRECT_URI") &&
  hasValue(env, "MICROSOFT_CLIENT_ID") &&
  hasValue(env, "MICROSOFT_CLIENT_SECRET") &&
  hasValue(env, "MICROSOFT_OUTLOOK_DRAFT_REDIRECT_URI");

console.log("");
console.log(ready ? "READY live draft OAuth env appears configured." : "NOT READY live draft OAuth env is incomplete.");
process.exit(0);
