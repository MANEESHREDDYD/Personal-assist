import { runAutomations } from "../src/lib/automation/engine";
import { prisma } from "../src/lib/prisma";

async function writeHeartbeat() {
  try {
    await prisma.userPreference.upsert({
      where: { key: "lastWorkerHeartbeatAt" },
      update: { value: new Date().toISOString() },
      create: { key: "lastWorkerHeartbeatAt", value: new Date().toISOString() }
    });
  } catch (e) {
    console.error("Failed to write heartbeat:", e);
  }
}

async function main() {
  console.log("Starting Local Automation Worker...");
  
  // Run immediately on start
  await writeHeartbeat();
  await runAutomations();

  // Then poll every 60 seconds
  setInterval(async () => {
    try {
      await writeHeartbeat();
      await runAutomations();
    } catch (e) {
      console.error("Worker interval encountered an error:", e);
    }
  }, 60000);
}

main().catch(console.error);
