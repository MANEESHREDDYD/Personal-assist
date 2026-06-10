import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.join(path.dirname(scriptPath), ".."));
const tmpDir = path.join(repoRoot, ".tmp");
const pidPath = path.join(tmpDir, "personal-assist-dev.pid");
const startScriptPath = path.join(repoRoot, "scripts", "start-personal-assist-dev.mjs");
const isWindows = process.platform === "win32";

function readPidFile() {
  try {
    return JSON.parse(fs.readFileSync(pidPath, "utf8"));
  } catch {
    return null;
  }
}

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function normalizeForCompare(value) {
  return path.resolve(value).toLowerCase();
}

function getWindowsProcessInfo(pid) {
  const command = [
    "$p = Get-CimInstance Win32_Process -Filter \"ProcessId = " + Number(pid) + "\"",
    "if ($null -eq $p) { exit 2 }",
    "$p | Select-Object ProcessId,ParentProcessId,CommandLine,ExecutablePath | ConvertTo-Json -Compress",
  ].join("; ");
  const output = execFileSync("powershell.exe", ["-NoProfile", "-Command", command], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  return output ? JSON.parse(output) : null;
}

function getPosixProcessInfo(pid) {
  const output = execFileSync("ps", ["-p", String(pid), "-o", "pid=,ppid=,command="], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  if (!output) return null;
  const match = output.match(/^\s*(\d+)\s+(\d+)\s+(.+)$/);
  if (!match) return null;
  return {
    ProcessId: Number(match[1]),
    ParentProcessId: Number(match[2]),
    CommandLine: match[3],
  };
}

function getProcessInfo(pid) {
  try {
    return isWindows ? getWindowsProcessInfo(pid) : getPosixProcessInfo(pid);
  } catch {
    return null;
  }
}

function verifyManagedRunner(pid, meta) {
  if (!meta?.repoRoot || normalizeForCompare(meta.repoRoot) !== normalizeForCompare(repoRoot)) {
    return { ok: false, reason: "PID file repoRoot does not match this repository." };
  }

  if (!meta?.runner || normalizeForCompare(meta.runner) !== normalizeForCompare(startScriptPath)) {
    return { ok: false, reason: "PID file runner does not match this repository." };
  }

  const info = getProcessInfo(pid);
  if (!info?.CommandLine) {
    return { ok: false, reason: "Could not verify process command line." };
  }

  const commandLine = info.CommandLine.toLowerCase();
  if (
    !commandLine.includes("start-personal-assist-dev.mjs") ||
    !commandLine.includes("--runner")
  ) {
    return { ok: false, reason: "PID does not belong to the Personal Assist dev runner." };
  }

  return { ok: true };
}

function stopProcessTree(pid) {
  if (isWindows) {
    execFileSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    return;
  }

  process.kill(pid, "SIGTERM");
}

const meta = readPidFile();
if (!meta?.pid) {
  console.log("No Personal Assist dev PID file found. Nothing to stop.");
  process.exit(0);
}

if (!isRunning(meta.pid)) {
  console.log("Personal Assist managed dev process is not running. Removing stale PID file.");
  fs.rmSync(pidPath, { force: true });
  process.exit(0);
}

const verification = verifyManagedRunner(meta.pid, meta);
if (!verification.ok) {
  console.warn(`Refusing to stop PID ${meta.pid}: ${verification.reason}`);
  console.warn("No process was killed. Remove the PID file manually only if you have verified it is stale.");
  process.exit(1);
}

stopProcessTree(meta.pid);
fs.rmSync(pidPath, { force: true });
console.log(`Stopped Personal Assist managed dev process ${meta.pid}.`);
