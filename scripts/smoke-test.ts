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

  try {
    console.log("Checking Analytics Layer...");
    const fs = require("fs");
    const path = require("path");
    
    const analyticsDir = path.join(process.cwd(), "analytics");
    if (fs.existsSync(analyticsDir)) {
      console.log("✅ Analytics source folder exists.");
      
      const sqlDir = path.join(analyticsDir, "sql");
      if (fs.existsSync(sqlDir)) {
        console.log("✅ SQL metrics folder exists.");
      }
      
      const sampleOutput = path.join(analyticsDir, "sample_outputs", "sample_metrics.json");
      if (fs.existsSync(sampleOutput)) {
        console.log("✅ Analytics sample output exists.");
      }
      
      const dataAnalyticsDir = path.join(process.cwd(), "data", "analytics");
      if (!fs.existsSync(dataAnalyticsDir)) {
        fs.mkdirSync(dataAnalyticsDir, { recursive: true });
      }
      fs.accessSync(dataAnalyticsDir, fs.constants.W_OK);
      console.log("✅ data/analytics folder is writable.");
      
      console.log("✅ Analytics Layer configured (Python execution is optional).");
    } else {
      console.log("ℹ️ Analytics layer not found (optional).");
    }
  } catch (error) {
    console.error("❌ Analytics check failed:", error);
    // Don't fail the smoke test if analytics has an issue, just warn
  }

  try {
    console.log("Checking Phase 3I Provider Attachment Layer...");
    const fs = require("fs");
    const path = require("path");
    const root = process.cwd();

    const requiredFiles = [
      "src/lib/attachments.ts",
      "src/lib/providerAttachments/validation.ts",
      "src/app/api/drafts/[id]/provider-attachments/route.ts",
      "src/app/drafts/ProviderAttachmentActions.tsx",
      "scripts/check-no-send-policy.mjs",
      "scripts/test-provider-attachments.ts",
    ];
    for (const rel of requiredFiles) {
      if (!fs.existsSync(path.join(root, rel))) {
        throw new Error(`Missing required file: ${rel}`);
      }
    }
    console.log("✅ Provider attachment source + test harness files present.");

    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
    if (!pkg.scripts || !pkg.scripts["test:provider-attachments"]) {
      throw new Error("Missing package script: test:provider-attachments");
    }
    console.log("✅ test:provider-attachments script present.");

    const attachmentsSrc = fs.readFileSync(path.join(root, "src/lib/attachments.ts"), "utf-8");
    for (const ext of [".exe", ".js", ".ps1", ".apk", ".pkg"]) {
      if (!attachmentsSrc.includes(`"${ext}"`)) {
        throw new Error(`Blocked extension list missing ${ext}`);
      }
    }
    console.log("✅ Blocked extension list includes .exe, .js, .ps1, .apk, .pkg.");

    if (!attachmentsSrc.includes("3 * 1024 * 1024")) {
      throw new Error("3 MB provider attachment limit not found");
    }
    if (!attachmentsSrc.includes("150 * 1024 * 1024")) {
      throw new Error("150 MB large attachment limit not found");
    }
    console.log("✅ 3 MB + 150 MB attachment limits present.");

    const outlookSrc = fs.readFileSync(path.join(root, "src/lib/integrations/outlookDraft.ts"), "utf-8");
    if (!outlookSrc.includes("createOutlookAttachmentUploadSession") || !outlookSrc.includes("attachLargeFileToOutlookDraft")) {
      throw new Error("Outlook upload session helpers not found");
    }
    console.log("✅ Outlook upload session helpers present.");

    const validationSrc = fs.readFileSync(path.join(root, "src/lib/providerAttachments/validation.ts"), "utf-8");
    if (!validationSrc.includes("classifyProviderAttachmentSize") || !validationSrc.includes("sizeClass")) {
      throw new Error("Validation helper does not support size classification");
    }
    console.log("✅ Validation helper supports size classification.");

    const harnessSrc = fs.readFileSync(path.join(root, "scripts/test-provider-attachments.ts"), "utf-8");
    if (!harnessSrc.includes("upload_session") || !harnessSrc.includes("too_large")) {
      throw new Error("Test harness missing large / too-large cases");
    }
    console.log("✅ Test harness includes large + too-large cases.");

    const agenticSrc = fs.readFileSync(
      path.join(root, "analytics/personal_assist_analytics/agentic.py"),
      "utf-8"
    );
    const sampleSrc = fs.readFileSync(
      path.join(root, "analytics/sample_outputs/sample_metrics.json"),
      "utf-8"
    );
    if (!agenticSrc.includes("analyze_provider_attachments") || !sampleSrc.includes("\"attachments\"")) {
      throw new Error("Provider attachment analytics metrics not found");
    }
    console.log("✅ Provider attachment analytics metrics present.");
  } catch (error) {
    console.error("❌ Phase 3I attachment layer check failed:", error);
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
