import { spawn } from "child_process";
import fs from "fs";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.join(path.dirname(scriptPath), ".."));
const tmpDir = path.join(repoRoot, ".tmp");
const pidPath = path.join(tmpDir, "personal-assist-dev.pid");
const logPath = path.join(tmpDir, "personal-assist-dev.log");
const isWindows = process.platform === "win32";
const npmCommand = "npm";

function ensureTmpDir() {
  fs.mkdirSync(tmpDir, { recursive: true });
}

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

function sameRepo(meta) {
  return meta?.repoRoot && path.resolve(meta.repoRoot) === repoRoot;
}

function isPortAvailable(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function isLocalDevPortAvailable(port) {
  const ipv4Available = await isPortAvailable(port, "127.0.0.1");
  const ipv6Available = await isPortAvailable(port, "::");
  return ipv4Available && ipv6Available;
}

function runManagedDevServer() {
  process.title = "personal-assist-dev-runner";
  ensureTmpDir();

  const child = spawn(npmCommand, ["run", "dev"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PERSONAL_ASSIST_MANAGED_DEV: "1",
      PERSONAL_ASSIST_REPO_ROOT: repoRoot,
    },
    stdio: ["ignore", "inherit", "inherit"],
    shell: isWindows,
    windowsHide: true,
  });

  const stopChild = () => {
    if (!child.killed && child.pid) {
      try {
        child.kill("SIGTERM");
      } catch {
        // The stop script may have already terminated the process tree.
      }
    }
  };

  process.on("SIGINT", () => {
    stopChild();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    stopChild();
    process.exit(0);
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

async function startDevServer() {
  ensureTmpDir();

  const existing = readPidFile();
  if (existing?.pid && sameRepo(existing) && isRunning(existing.pid)) {
    console.log(`Personal Assist dev server already managed with PID ${existing.pid}.`);
    console.log(`Log: ${logPath}`);
    return;
  }

  if (existing?.pid) {
    console.log("Removing stale or unverifiable Personal Assist dev PID file.");
    fs.rmSync(pidPath, { force: true });
  }

  const portAvailable = await isLocalDevPortAvailable(3000);
  if (!portAvailable) {
    console.error("Port 3000 is already in use. Refusing to start Personal Assist dev server.");
    console.error("Stop or move the other server first, then run npm run dev:safe again.");
    console.error("No process was started and no PID file was written.");
    process.exit(1);
  }

  const logFd = fs.openSync(logPath, "a");
  const child = spawn(process.execPath, [scriptPath, "--runner"], {
    cwd: repoRoot,
    detached: true,
    env: {
      ...process.env,
      PERSONAL_ASSIST_REPO_ROOT: repoRoot,
    },
    stdio: ["ignore", logFd, logFd],
    windowsHide: true,
  });

  fs.closeSync(logFd);

  const metadata = {
    pid: child.pid,
    repoRoot,
    command: "npm run dev",
    runner: scriptPath,
    logPath,
    startedAt: new Date().toISOString(),
  };
  fs.writeFileSync(pidPath, `${JSON.stringify(metadata, null, 2)}\n`);
  child.unref();

  console.log(`Started Personal Assist dev server with managed PID ${child.pid}.`);
  console.log("URL: http://localhost:3000");
  console.log(`PID file: ${pidPath}`);
  console.log(`Log: ${logPath}`);
  console.log("Stop with: npm run dev:stop");
}

if (process.argv.includes("--runner")) {
  runManagedDevServer();
} else {
  startDevServer().catch((error) => {
    console.error("Failed to start Personal Assist dev server:", error?.message || error);
    process.exit(1);
  });
}
