# Role-Based Manual Test Checklist — Personal Assist OS

Verify the role-based OS locally. Personal Assist OS is **local-first** and adapts to your
role. Across every role the safety guarantees hold: **no email send**, **no silent calendar
writes**, all external write actions are **approval-gated**, and drafts stay local drafts.

## Setup

```bash
npm install
npm run db:reset      # creates role tables + seeds demo data
npm run dev:safe
```

Open `http://127.0.0.1:3000`.

## Shared role flow (run once per role)

For each role below: **select the role → view its dashboard → run a quick action / command →
review the proposed local action → optionally save it as a local draft → confirm the no-send
boundary.**

1. Go to `/roles/select` and pick the role (or open `/roles/[role]` and "Make active").
2. Open `/roles/[role]` — confirm the dashboard shows role-specific cards, quick actions,
   local AI workflows, and command suggestions.
3. Click a quick action — it opens `/command-center?role=…&cmd=…`.
4. Optionally paste context (syllabus, incident text, notes) and click **Propose action**.
5. Confirm a **proposed local action** appears (draft / plan / summary / checklist / memo / brief)
   with the safety note. Nothing is sent or scheduled.
6. Click **Save as local draft** → confirm it appears in `/drafts` with status `draft`.
7. Confirm Settings → Role Profile (`/settings/role-profile`) shows the active role.

### Student
- [ ] Select **Student**; dashboard shows Assignments / Exams / Study Plan / Courses / Applications
- [ ] Command: "Plan my study week" → study-plan proposal
- [ ] Command: "Turn this syllabus into deadlines" (paste a syllabus) → deadline proposal
- [ ] Command: "Draft an email to my professor" → local draft (not sent)

### Common public / personal
- [ ] Select **Personal / Everyday**; dashboard shows Tasks / Bills / Appointments / Travel / Documents
- [ ] Command: "Plan my week" → plan
- [ ] Command: "Prepare a travel checklist" → checklist
- [ ] Command: "Summarize this document" (paste text) → summary

### Engineer / IT professional
- [ ] Select **Engineer** (or **IT Professional**); dashboard shows Tasks / Incidents / Runbooks / Architecture / Deployments
- [ ] Command: "Turn this incident into a postmortem" (paste incident notes) → postmortem draft
- [ ] Command: "Create a deployment checklist" → checklist
- [ ] Command: "Generate my standup update" → brief

### Manager / team lead
- [ ] Select **Manager** (or **Team Lead**); dashboard shows Team / 1:1s / Tasks / Weekly Review / Decisions
- [ ] Command: "Prepare my 1:1" → talking points
- [ ] Command: "Generate team weekly update" → update
- [ ] Command: "Draft feedback" → local draft

### Director / VP / executive
- [ ] Select **Director** or **VP**; dashboard shows Brief / OKRs / Initiatives / Risks / Stakeholders
- [ ] Command: "Prepare executive brief" → brief
- [ ] Command: "Draft stakeholder update" → local draft
- [ ] Command: "Create decision memo" → memo

### Founder / CEO
- [ ] Select **Founder** or **CEO**; dashboard shows Investors / Fundraising / Customers / Hiring / Roadmap / Board Updates
- [ ] Command: "Draft investor follow-up" → local draft
- [ ] Command: "Prepare board update" → brief
- [ ] Command: "Summarize customer calls" (paste notes) → summary

### VC / investor
- [ ] Select **VC / Investor**; dashboard shows Deals / Companies / Memos / Diligence / Portfolio / Theses
- [ ] Command: "Create investment memo" → informational memo (decision support, not advice)
- [ ] Command: "Generate diligence checklist" → checklist
- [ ] Command: "Draft founder follow-up" → local draft

## Safety verification (run after role testing)

```bash
npm run security:no-send          # PASS — no send endpoints in src/
npm run security:demo-evidence    # PASS
npm run test:provider-attachments # 12/12
npm run analytics:run             # emails_sent = 0; roleUsageMetrics present
```

- [ ] `security:no-send` PASS
- [ ] No command center action ever sends email or writes an external calendar
- [ ] Saved drafts remain status `draft` until you approve + create a provider draft, then send manually
- [ ] `emails_sent` = 0 in `data/analytics/personal_assist_metrics.json`
- [ ] `roleUsageMetrics.active_role` reflects your selected role

## Analytics / showcase

- [ ] `/showcase` shows the **Role-Based Personal Assist OS** section (all 11 roles)
- [ ] `/roadmap` shows Phase 5A/5I complete and live verification pending
- [ ] Live Gmail/Outlook verification remains **pending** until you add OAuth credentials

## Cleanup

```bash
npm run dev:stop
git status   # clean; no .env / dev.db / data/uploads / data/analytics output / tokens staged
```

> Note: the bespoke per-feature sub-pages (e.g. `/student/assignments`, `/engineering/incidents`)
> are being added incrementally. Today, each role's workspace cards route through the
> **Command Center**, which generates the corresponding local proposal. The role dashboards,
> quick actions, workflows, and command center are fully functional.
