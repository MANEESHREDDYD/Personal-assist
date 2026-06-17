/**
 * Deterministic project decomposer (Phase 6E). Pure + testable.
 *
 * Turns a goal sentence into stages + tasks with estimates, spread due offsets, and
 * a cross-stage dependency chain. Template detection is keyword-based; a generic
 * Plan/Execute/Review fallback always applies. A local AI provider can refine this
 * later, but these rules are the always-available base.
 */

import type { DecompositionResult, DecomposedStage, DecomposedTask } from "./types";

interface Template {
  id: string;
  match: RegExp;
  stages: { name: string; tasks: { title: string; mins: number; priority: number }[] }[];
}

const TEMPLATES: Template[] = [
  {
    id: "website",
    match: /portfolio|website|web ?site|landing page|web app/i,
    stages: [
      { name: "Discovery", tasks: [{ title: "Define scope & goals", mins: 60, priority: 1 }, { title: "Gather content & assets", mins: 90, priority: 2 }] },
      { name: "Design", tasks: [{ title: "Wireframe key pages", mins: 120, priority: 2 }, { title: "Visual design / theme", mins: 120, priority: 2 }] },
      { name: "Build", tasks: [{ title: "Scaffold project", mins: 90, priority: 1 }, { title: "Implement pages", mins: 180, priority: 1 }, { title: "Make responsive", mins: 90, priority: 3 }] },
      { name: "Launch", tasks: [{ title: "QA & polish", mins: 90, priority: 2 }, { title: "Deploy", mins: 60, priority: 1 }, { title: "Announce", mins: 30, priority: 4 }] },
    ],
  },
  {
    id: "fundraising",
    match: /fundrais|investor outreach|raise|seed round|pitch campaign/i,
    stages: [
      { name: "Prep", tasks: [{ title: "Build target investor list", mins: 90, priority: 1 }, { title: "Refine narrative & deck", mins: 120, priority: 1 }] },
      { name: "Outreach", tasks: [{ title: "Request warm intros", mins: 60, priority: 2 }, { title: "Send outreach (draft only)", mins: 60, priority: 2 }] },
      { name: "Meetings", tasks: [{ title: "Pitch prep", mins: 90, priority: 1 }, { title: "Run investor meetings", mins: 180, priority: 1 }] },
      { name: "Follow-up", tasks: [{ title: "Send follow-ups (draft only)", mins: 45, priority: 2 }, { title: "Track diligence requests", mins: 60, priority: 3 }] },
    ],
  },
  {
    id: "exams",
    match: /exam|final exams|study for|midterm|test prep/i,
    stages: [
      { name: "Plan", tasks: [{ title: "Review syllabus & topics", mins: 60, priority: 1 }, { title: "Build study schedule", mins: 45, priority: 2 }] },
      { name: "Study", tasks: [{ title: "Review core topics", mins: 180, priority: 1 }, { title: "Practice problems", mins: 120, priority: 1 }] },
      { name: "Final prep", tasks: [{ title: "Take a mock exam", mins: 120, priority: 2 }, { title: "Review weak areas", mins: 90, priority: 1 }] },
    ],
  },
  {
    id: "discovery_sprint",
    match: /customer discovery|discovery sprint|user research|interviews? sprint/i,
    stages: [
      { name: "Plan", tasks: [{ title: "Define research questions", mins: 60, priority: 1 }, { title: "Recruit participants", mins: 90, priority: 2 }] },
      { name: "Interviews", tasks: [{ title: "Run interviews", mins: 240, priority: 1 }, { title: "Capture notes", mins: 60, priority: 2 }] },
      { name: "Synthesis", tasks: [{ title: "Synthesize themes", mins: 120, priority: 1 }, { title: "Write findings report (draft)", mins: 90, priority: 2 }] },
    ],
  },
  {
    id: "software",
    match: /ship|launch|build|implement|release|feature|phase \d|project manager|api|app\b/i,
    stages: [
      { name: "Plan", tasks: [{ title: "Define scope & requirements", mins: 90, priority: 1 }, { title: "Design approach", mins: 120, priority: 1 }] },
      { name: "Build", tasks: [{ title: "Implement core", mins: 240, priority: 1 }, { title: "Write tests", mins: 120, priority: 2 }] },
      { name: "Stabilize", tasks: [{ title: "QA & fix bugs", mins: 120, priority: 2 }, { title: "Review & docs", mins: 90, priority: 3 }] },
      { name: "Release", tasks: [{ title: "Final verification", mins: 60, priority: 1 }, { title: "Ship / deploy", mins: 60, priority: 1 }] },
    ],
  },
];

const GENERIC: Template["stages"] = [
  { name: "Plan", tasks: [{ title: "Define goal & scope", mins: 60, priority: 1 }, { title: "Break down work", mins: 60, priority: 2 }] },
  { name: "Execute", tasks: [{ title: "Do the main work", mins: 180, priority: 1 }, { title: "Track progress", mins: 45, priority: 3 }] },
  { name: "Review", tasks: [{ title: "Review & finalize", mins: 90, priority: 2 }, { title: "Wrap up & summary", mins: 45, priority: 3 }] },
];

/** Parses a timeframe in days from "in two weeks", "in 10 days", "by next month". */
export function parseDurationDays(text: string): number {
  const t = text.toLowerCase();
  const words: Record<string, number> = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const m = t.match(/in\s+(\d+|a|one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|days|week|weeks|month|months)/);
  if (m) {
    const n = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : (words[m[1]] ?? 1);
    if (/week/.test(m[2])) return n * 7;
    if (/month/.test(m[2])) return n * 30;
    return n;
  }
  if (/this week|by friday|end of week/.test(t)) return 5;
  if (/next week/.test(t)) return 12;
  if (/tomorrow/.test(t)) return 1;
  return 14; // default two weeks
}

export function decomposeProject(text: string): DecompositionResult {
  const tpl = TEMPLATES.find((x) => x.match.test(text));
  const stageDefs = tpl ? tpl.stages : GENERIC;
  const durationDays = parseDurationDays(text);

  const stages: DecomposedStage[] = [];
  let flatIndex = 0;
  let prevStageLastIndex = -1;
  const stageCount = stageDefs.length;

  stageDefs.forEach((sd, si) => {
    // Spread due dates: each stage's tasks are due by the end of its time slice.
    const stageDueDay = Math.max(1, Math.round(((si + 1) / stageCount) * durationDays));
    const firstIndexOfStage = flatIndex;
    const tasks: DecomposedTask[] = sd.tasks.map((td, ti) => {
      const task: DecomposedTask = {
        title: td.title,
        estimateMins: td.mins,
        priority: td.priority,
        dueOffsetDays: stageDueDay,
        // first task of a stage depends on the previous stage's last task (sequential stages)
        dependsOnIndex: ti === 0 && prevStageLastIndex >= 0 ? prevStageLastIndex : undefined,
      };
      flatIndex++;
      return task;
    });
    prevStageLastIndex = firstIndexOfStage + sd.tasks.length - 1;
    stages.push({ name: sd.name, tasks });
  });

  const totalMins = stages.reduce((s, st) => s + st.tasks.reduce((a, t) => a + t.estimateMins, 0), 0);
  const totalEstimateHrs = Math.round((totalMins / 60) * 10) / 10;
  const workingHrsAvailable = durationDays * 6 * (5 / 7); // ~6 focused hrs/workday

  const riskNotes: string[] = [];
  if (totalEstimateHrs > workingHrsAvailable) riskNotes.push(`Tight timeline: ~${totalEstimateHrs}h of work vs ~${Math.round(workingHrsAvailable)}h available in ${durationDays} days.`);
  if (durationDays <= 3) riskNotes.push("Very short timeframe — consider reducing scope.");

  const brief = `${tpl ? tpl.id.replace(/_/g, " ") : "general"} plan with ${stages.length} stages and ${flatIndex} tasks over ~${durationDays} days (~${totalEstimateHrs}h estimated).`;

  return { stages, riskNotes, brief, detectedTemplate: tpl?.id ?? "generic", totalEstimateHrs };
}
