import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function runSmokeTest() {
  console.log("Starting Local MVP Smoke Test...");

  let errors = 0;

  try {
    console.log("Checking DB Connection...");
    const count = await prisma.userPreference.count();
    console.log("✅ DB Connected.");
  } catch (e) {
    console.error("❌ DB Connection Failed:", e);
    errors++;
  }

  try {
    console.log("Checking Schema Integrity...");
    await prisma.walletCard.findFirst();
    await prisma.document.findFirst();
    await prisma.inboxItem.findFirst();
    await prisma.calendarEvent.findFirst();
    await prisma.automationRule.findFirst();
    console.log("✅ Schema ok.");
  } catch (e) {
    console.error("❌ Schema query failed:", e);
    errors++;
  }

  try {
     console.log("Checking Onboarding Status...");
     const pref = await prisma.userPreference.findUnique({ where: { key: "onboardingCompleted" } });
     console.log(`✅ Onboarding Completed: ${pref?.value || "false"}`);
  } catch (e) {
     console.error("❌ Onboarding read failed:", e);
     errors++;
  }

  try {
    console.log("Checking Upload Directory...");
    const fs = require("fs");
    const path = require("path");
    const uploadDir = path.join(process.cwd(), "data", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.accessSync(uploadDir, fs.constants.W_OK);
    console.log("✅ Uploads directory is writable:", uploadDir);
  } catch (error) {
    console.error("❌ Cannot write to uploads directory:", error);
    errors++;
  }

  if (errors > 0) {
    console.error(`\nSmoke test finished with ${errors} errors.`);
    process.exit(1);
  } else {
    console.log("\n✅ All smoke tests passed! System is ready for demo.");
    process.exit(0);
  }
}

runSmokeTest();
