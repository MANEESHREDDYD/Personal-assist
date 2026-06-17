/**
 * Role registry for Personal Assist OS (Phase 5A).
 *
 * One shared platform, role-specific layers. This registry is the single source
 * of truth for role metadata, dashboards, quick actions, workflow templates, and
 * command suggestions. Role pages render from this data, so adding/adjusting a
 * role is a data change — not new bespoke routes.
 *
 * Safety: quick actions and workflows only ever PROPOSE local drafts/tasks/plans.
 * Nothing here sends email or writes to external calendars; all external write
 * actions remain approval-gated elsewhere in the app.
 */

export type RoleId =
  | "student"
  | "public_personal"
  | "engineer"
  | "it_professional"
  | "manager"
  | "team_lead"
  | "director"
  | "vp"
  | "founder"
  | "ceo"
  | "vc_investor";

export interface RoleDashboardCard {
  title: string;
  description: string;
  href?: string;
}

export interface RoleQuickAction {
  label: string;
  /** A natural-language command routed to the local command center. */
  command: string;
}

export interface RoleWorkflow {
  name: string;
  description: string;
  /** Local AI prompt template; produces a draft/plan only, never sends. */
  prompt: string;
}

export interface RoleDefinition {
  id: RoleId;
  label: string;
  group: "personal" | "technical" | "leadership" | "investing";
  tagline: string;
  /** lucide-react icon name (resolved in UI). */
  icon: string;
  accent: string; // tailwind color token, e.g. "blue"
  summary: string;
  dashboardCards: RoleDashboardCard[];
  quickActions: RoleQuickAction[];
  workflows: RoleWorkflow[];
  commandSuggestions: string[];
}

export const DEFAULT_ROLE: RoleId = "public_personal";

export const ROLES: Record<RoleId, RoleDefinition> = {
  student: {
    id: "student",
    label: "Student",
    group: "personal",
    tagline: "Plan study, track deadlines, draft to professors.",
    icon: "GraduationCap",
    accent: "blue",
    summary:
      "Turn syllabi into deadlines, plan study weeks, track assignments/exams and applications, and draft polite academic emails — all local.",
    dashboardCards: [
      { title: "Assignments", description: "Track coursework and due dates", href: "/student/assignments" },
      { title: "Exams", description: "Plan and prepare for exams", href: "/student/exams" },
      { title: "Study Plan", description: "Generate a weekly study schedule", href: "/student/study-plan" },
      { title: "Courses", description: "Class timetable and progress", href: "/student/courses" },
      { title: "Applications", description: "Internships, jobs, scholarships", href: "/student/applications" },
    ],
    quickActions: [
      { label: "Plan my study week", command: "Plan my study week" },
      { label: "Syllabus → deadlines", command: "Turn this syllabus into deadlines" },
      { label: "Draft email to professor", command: "Draft an email to my professor" },
      { label: "Summarize a reading", command: "Summarize this reading" },
    ],
    workflows: [
      { name: "Syllabus to deadlines", description: "Extract academic deadlines from a syllabus", prompt: "Extract all assignment and exam deadlines from this syllabus and propose local academic deadline items: {context}" },
      { name: "Weekly study plan", description: "Balanced study schedule across courses", prompt: "Create a balanced weekly study plan across these courses and deadlines: {context}" },
      { name: "Professor email", description: "Draft a polite academic email", prompt: "Draft a polite, concise email to a professor about: {context}. Output a draft only; do not send." },
      { name: "Interview prep plan", description: "Prepare for an internship/job interview", prompt: "Create an interview preparation plan for this role: {context}" },
    ],
    commandSuggestions: ["Plan my study week", "Turn this syllabus into tasks", "Draft email to professor", "Summarize this reading", "Prepare interview plan"],
  },
  public_personal: {
    id: "public_personal",
    label: "Personal / Everyday",
    group: "personal",
    tagline: "Run life admin: tasks, bills, appointments, travel.",
    icon: "Home",
    accent: "emerald",
    summary:
      "A calm life-admin OS: plan your week, track bills and renewals, organize documents, and draft polite emails. No financial or medical advice.",
    dashboardCards: [
      { title: "Tasks", description: "Personal task planner", href: "/life/tasks" },
      { title: "Bills & Renewals", description: "Bill and subscription reminders", href: "/life/bills" },
      { title: "Appointments", description: "Plan and track appointments", href: "/life/appointments" },
      { title: "Travel", description: "Trip planning checklists", href: "/life/travel" },
      { title: "Documents", description: "Family/insurance document folders", href: "/life/documents" },
    ],
    quickActions: [
      { label: "Plan my week", command: "Plan my week" },
      { label: "Remind me about renewals", command: "Remind me about upcoming renewals" },
      { label: "Draft a polite email", command: "Draft a polite email" },
      { label: "Travel checklist", command: "Prepare a travel checklist" },
    ],
    workflows: [
      { name: "Weekly life plan", description: "Organize the week's personal tasks", prompt: "Plan my personal week from these tasks and appointments: {context}" },
      { name: "Renewal reminders", description: "Find upcoming bills/subscriptions", prompt: "Identify upcoming bills/subscription renewals and propose reminders from: {context}" },
      { name: "Document summary", description: "Summarize a personal document", prompt: "Summarize this document in plain language (no medical/financial advice): {context}" },
      { name: "Travel checklist", description: "Build a trip checklist", prompt: "Create a travel checklist for this trip: {context}" },
    ],
    commandSuggestions: ["Plan my day", "Plan my week", "Schedule my overdue tasks", "Protect 10 hours of focus time", "Create a weekly review", "Summarize this document", "Draft a polite email"],
  },
  engineer: {
    id: "engineer",
    label: "Engineer",
    group: "technical",
    tagline: "Tasks, incidents, runbooks, deployments, standups.",
    icon: "Code",
    accent: "cyan",
    summary:
      "An engineering operations layer: triage bugs, run incidents, write runbooks and ADRs, build deployment checklists, and generate standup updates locally.",
    dashboardCards: [
      { title: "Tasks", description: "Engineering task board", href: "/engineering/tasks" },
      { title: "Incidents", description: "Track and postmortem incidents", href: "/engineering/incidents" },
      { title: "Runbooks", description: "Operational runbooks", href: "/engineering/runbooks" },
      { title: "Architecture", description: "Architecture decision records", href: "/engineering/architecture" },
      { title: "Deployments", description: "Deployment checklists", href: "/engineering/deployments" },
    ],
    quickActions: [
      { label: "Incident → postmortem", command: "Turn this incident into a postmortem" },
      { label: "Create a runbook", command: "Create a runbook" },
      { label: "Generate standup update", command: "Generate my standup update" },
      { label: "Deployment checklist", command: "Create a deployment checklist" },
    ],
    workflows: [
      { name: "Postmortem", description: "Blameless postmortem from an incident", prompt: "Write a blameless postmortem (summary, timeline, impact, root cause, action items) from this incident: {context}" },
      { name: "Runbook", description: "Operational runbook for a system", prompt: "Create an operational runbook for: {context}" },
      { name: "Standup update", description: "Yesterday/today/blockers", prompt: "Generate a concise standup update (yesterday, today, blockers) from: {context}" },
      { name: "Deployment checklist", description: "Pre/post deploy steps", prompt: "Create a deployment checklist (pre-deploy, deploy, rollback, verify) for: {context}" },
      { name: "Bug triage", description: "Prioritize a list of bugs", prompt: "Prioritize these bugs by severity and impact and propose tasks: {context}" },
    ],
    commandSuggestions: ["Turn this incident into a postmortem", "Create deployment checklist", "Generate standup update", "Create project plan", "Decompose this project", "Forecast project workload", "Find blocked tasks", "Summarize this technical doc"],
  },
  it_professional: {
    id: "it_professional",
    label: "IT Professional",
    group: "technical",
    tagline: "Tickets, on-call handoffs, change checklists.",
    icon: "Server",
    accent: "indigo",
    summary:
      "IT operations support: convert tickets to tasks, build change/maintenance checklists, prepare on-call handoffs, and summarize technical docs locally.",
    dashboardCards: [
      { title: "Tasks", description: "Ticket-driven task board", href: "/engineering/tasks" },
      { title: "Incidents", description: "Incident + change tracking", href: "/engineering/incidents" },
      { title: "Runbooks", description: "Operational runbooks", href: "/engineering/runbooks" },
      { title: "Deployments", description: "Change/maintenance checklists", href: "/engineering/deployments" },
    ],
    quickActions: [
      { label: "Ticket → task", command: "Turn this ticket into a task plan" },
      { label: "On-call handoff", command: "Prepare an on-call handoff" },
      { label: "Change checklist", command: "Create a change/maintenance checklist" },
      { label: "Summarize tech doc", command: "Summarize this technical doc" },
    ],
    workflows: [
      { name: "Ticket to task", description: "Break a ticket into actions", prompt: "Break this ticket into a clear task plan with steps and owners: {context}" },
      { name: "On-call handoff", description: "Handoff summary for next on-call", prompt: "Prepare an on-call handoff (open issues, watch items, recent changes) from: {context}" },
      { name: "Change checklist", description: "Maintenance/change steps", prompt: "Create a change/maintenance checklist with rollback for: {context}" },
    ],
    commandSuggestions: ["Turn this ticket into a task plan", "Prepare an on-call handoff", "Create a change checklist", "Summarize this technical doc", "Generate standup update"],
  },
  manager: {
    id: "manager",
    label: "Manager",
    group: "leadership",
    tagline: "1:1s, team tasks, feedback, weekly reviews.",
    icon: "Users",
    accent: "violet",
    summary:
      "A people-management layer: prepare 1:1s, plan team tasks and delegation, draft feedback, run weekly reviews, and track decisions and risks locally.",
    dashboardCards: [
      { title: "Team", description: "Team members and workload", href: "/manager/team" },
      { title: "1:1s", description: "One-on-one prep and notes", href: "/manager/one-on-ones" },
      { title: "Tasks", description: "Team task planner", href: "/manager/tasks" },
      { title: "Weekly Review", description: "Team weekly update", href: "/manager/weekly-review" },
      { title: "Decisions", description: "Decision log", href: "/manager/decisions" },
    ],
    quickActions: [
      { label: "Prepare my 1:1", command: "Prepare my 1:1" },
      { label: "Team weekly update", command: "Generate team weekly update" },
      { label: "Draft feedback", command: "Draft feedback" },
      { label: "Find overloaded people", command: "Identify overloaded team members" },
    ],
    workflows: [
      { name: "1:1 prep", description: "Talking points for a 1:1", prompt: "Prepare 1:1 talking points (wins, blockers, growth, follow-ups) from: {context}" },
      { name: "Team weekly update", description: "Summarize the team's week", prompt: "Generate a team weekly update (shipped, in progress, risks) from: {context}" },
      { name: "Feedback draft", description: "Constructive feedback note", prompt: "Draft constructive, specific feedback (situation, behavior, impact, next step) for: {context}" },
      { name: "Delegation plan", description: "Distribute work fairly", prompt: "Create a delegation plan balancing workload across the team: {context}" },
    ],
    commandSuggestions: ["Prepare my 1:1s", "Create team weekly update", "Draft feedback", "Plan my week", "Suggest what to move", "Find my most fragmented day", "Identify overloaded team members", "Create delegation plan"],
  },
  team_lead: {
    id: "team_lead",
    label: "Team Lead",
    group: "leadership",
    tagline: "Coordinate delivery, unblock, summarize standups.",
    icon: "GitMerge",
    accent: "violet",
    summary:
      "A delivery-coordination layer: plan team tasks, summarize standups and meetings, track follow-ups and escalations, and prep 1:1s locally.",
    dashboardCards: [
      { title: "Team", description: "Members and workload", href: "/manager/team" },
      { title: "Tasks", description: "Delivery task planner", href: "/manager/tasks" },
      { title: "1:1s", description: "One-on-one prep", href: "/manager/one-on-ones" },
      { title: "Weekly Review", description: "Delivery weekly update", href: "/manager/weekly-review" },
    ],
    quickActions: [
      { label: "Summarize standup", command: "Summarize meeting actions" },
      { label: "Weekly delivery update", command: "Generate team weekly update" },
      { label: "Track escalations", command: "Summarize open risks and escalations" },
      { label: "Prepare 1:1", command: "Prepare my 1:1" },
    ],
    workflows: [
      { name: "Standup summary", description: "Action items from standup", prompt: "Summarize this standup into decisions, action items, and blockers: {context}" },
      { name: "Escalation summary", description: "Risks needing attention", prompt: "Summarize open risks and escalations with suggested next steps from: {context}" },
      { name: "Delivery update", description: "Weekly delivery status", prompt: "Generate a delivery-focused weekly update from: {context}" },
    ],
    commandSuggestions: ["Summarize meeting actions", "Generate team weekly update", "Summarize open risks", "Prepare my 1:1s", "Create delegation plan"],
  },
  director: {
    id: "director",
    label: "Director",
    group: "leadership",
    tagline: "Initiatives, OKRs, stakeholder updates, risks.",
    icon: "Target",
    accent: "amber",
    summary:
      "A cross-functional leadership layer: track strategic initiatives and OKRs, draft stakeholder updates and decision memos, and maintain a risk register locally.",
    dashboardCards: [
      { title: "Executive Brief", description: "Daily leadership brief", href: "/executive/brief" },
      { title: "OKRs", description: "Objectives and key results", href: "/executive/okrs" },
      { title: "Initiatives", description: "Strategic initiative tracker", href: "/executive/initiatives" },
      { title: "Risks", description: "Risk register", href: "/executive/risks" },
      { title: "Stakeholders", description: "Stakeholder updates", href: "/executive/stakeholders" },
    ],
    quickActions: [
      { label: "Prepare executive brief", command: "Prepare executive brief" },
      { label: "Draft stakeholder update", command: "Draft stakeholder update" },
      { label: "Summarize risks", command: "Summarize risks" },
      { label: "Create decision memo", command: "Create decision memo" },
    ],
    workflows: [
      { name: "Executive brief", description: "Daily priorities and risks", prompt: "Prepare an executive brief (top priorities, decisions needed, risks) from: {context}" },
      { name: "Stakeholder update", description: "Concise stakeholder note", prompt: "Draft a concise stakeholder update (progress, asks, risks) from: {context}" },
      { name: "Decision memo", description: "Structured decision memo", prompt: "Write a decision memo (context, options, recommendation, risks) for: {context}" },
      { name: "Risk summary", description: "Summarize the risk register", prompt: "Summarize the risk register by severity with mitigations from: {context}" },
    ],
    commandSuggestions: ["Prepare executive brief", "Draft stakeholder update", "Summarize risks", "Create decision memo", "Find top priorities", "Prepare leadership meeting"],
  },
  vp: {
    id: "vp",
    label: "VP",
    group: "leadership",
    tagline: "Org priorities, board-ready briefs, dependencies.",
    icon: "Building2",
    accent: "amber",
    summary:
      "A senior-executive layer: align org priorities, prepare board/leadership briefs and decision memos, track cross-functional dependencies and risks locally.",
    dashboardCards: [
      { title: "Executive Brief", description: "Leadership daily brief", href: "/executive/brief" },
      { title: "OKRs", description: "Org objectives", href: "/executive/okrs" },
      { title: "Initiatives", description: "Org initiatives + dependencies", href: "/executive/initiatives" },
      { title: "Risks", description: "Risk register", href: "/executive/risks" },
      { title: "Stakeholders", description: "Exec stakeholder updates", href: "/executive/stakeholders" },
    ],
    quickActions: [
      { label: "Prepare leadership meeting", command: "Prepare leadership meeting" },
      { label: "Draft board-ready update", command: "Draft a board-ready update" },
      { label: "Top priorities", command: "Find top priorities" },
      { label: "Summarize risks", command: "Summarize risks" },
    ],
    workflows: [
      { name: "Leadership meeting prep", description: "Agenda and decisions", prompt: "Prepare a leadership meeting agenda with decisions needed from: {context}" },
      { name: "Board-ready update", description: "Exec summary for the board", prompt: "Draft a board-ready org update (highlights, metrics narrative, risks, asks) from: {context}" },
      { name: "Priority heatmap", description: "Rank org priorities", prompt: "Rank these org priorities by impact and urgency and explain trade-offs: {context}" },
    ],
    commandSuggestions: ["Prepare leadership meeting", "Draft stakeholder update", "Find top priorities", "Summarize risks", "Create decision memo"],
  },
  founder: {
    id: "founder",
    label: "Founder",
    group: "leadership",
    tagline: "Fundraising, investors, customers, hiring, board.",
    icon: "Rocket",
    accent: "pink",
    summary:
      "A founder command center: track fundraising and investor CRM, summarize customer discovery, manage hiring and roadmap, and draft board/investor updates locally. No financial advice.",
    dashboardCards: [
      { title: "Investors", description: "Investor CRM", href: "/founder/investors" },
      { title: "Fundraising", description: "Raise pipeline", href: "/founder/fundraising" },
      { title: "Customers", description: "Discovery call notes", href: "/founder/customers" },
      { title: "Hiring", description: "Hiring pipeline", href: "/founder/hiring" },
      { title: "Roadmap", description: "Product roadmap", href: "/founder/roadmap" },
      { title: "Board Updates", description: "Board update drafts", href: "/founder/board-updates" },
    ],
    quickActions: [
      { label: "Draft investor follow-up", command: "Draft investor follow-up" },
      { label: "Prepare board update", command: "Prepare board update" },
      { label: "Summarize customer calls", command: "Summarize customer calls" },
      { label: "Founder daily plan", command: "Create founder daily plan" },
    ],
    workflows: [
      { name: "Investor follow-up", description: "Warm, specific follow-up", prompt: "Draft an investor follow-up referencing the conversation and clear next steps: {context}. Draft only; do not send." },
      { name: "Board update", description: "Structured board update", prompt: "Prepare a board update (highlights, metrics narrative, lowlights, asks) from: {context}" },
      { name: "Customer call summary", description: "Discovery insights", prompt: "Summarize these customer discovery calls into themes, pains, and next steps: {context}" },
      { name: "Roadmap prioritization", description: "Sequence the roadmap", prompt: "Prioritize these roadmap items by impact and effort and propose a sequence: {context}" },
    ],
    commandSuggestions: ["Draft investor follow-up", "Prepare board update", "Summarize customer calls", "Prioritize roadmap", "Create founder daily plan", "Prepare pitch meeting"],
  },
  ceo: {
    id: "ceo",
    label: "CEO",
    group: "leadership",
    tagline: "Operating reviews, board, stakeholders, priorities.",
    icon: "Crown",
    accent: "pink",
    summary:
      "A CEO operating layer: run operating reviews, prepare board and stakeholder communications, set top priorities, and drive the company daily plan locally. No financial advice.",
    dashboardCards: [
      { title: "Daily Brief", description: "CEO daily plan", href: "/executive/brief" },
      { title: "Board Updates", description: "Board update drafts", href: "/founder/board-updates" },
      { title: "Investors", description: "Investor relationships", href: "/founder/investors" },
      { title: "Roadmap", description: "Company roadmap", href: "/founder/roadmap" },
      { title: "Risks", description: "Company risk register", href: "/executive/risks" },
    ],
    quickActions: [
      { label: "Prepare board update", command: "Prepare board update" },
      { label: "Operating review", command: "Prepare a company operating review" },
      { label: "Top priorities", command: "Find top priorities" },
      { label: "CEO daily plan", command: "Create founder daily plan" },
    ],
    workflows: [
      { name: "Operating review", description: "Company operating review", prompt: "Prepare a company operating review (metrics narrative, wins, risks, decisions) from: {context}" },
      { name: "Board update", description: "Board communication", prompt: "Prepare a board update (highlights, lowlights, metrics, asks) from: {context}" },
      { name: "Stakeholder note", description: "External stakeholder comms", prompt: "Draft a stakeholder communication from: {context}. Draft only; do not send." },
    ],
    commandSuggestions: ["Prepare board update", "Prepare a company operating review", "Turn this goal into tasks", "Generate project status update", "Prepare stakeholder update", "Find top priorities", "Create founder daily plan"],
  },
  vc_investor: {
    id: "vc_investor",
    label: "VC / Investor",
    group: "investing",
    tagline: "Deals, diligence, memos, portfolio — decision support.",
    icon: "TrendingUp",
    accent: "teal",
    summary:
      "An investing workflow layer (informational, not investment advice): manage deal pipeline and founder CRM, run diligence, draft investment/IC memos, and track portfolio and theses locally.",
    dashboardCards: [
      { title: "Deals", description: "Deal pipeline", href: "/investor/deals" },
      { title: "Companies", description: "Company notes", href: "/investor/companies" },
      { title: "Memos", description: "Investment memo drafts", href: "/investor/memos" },
      { title: "Diligence", description: "Diligence checklists", href: "/investor/diligence" },
      { title: "Portfolio", description: "Portfolio tracker", href: "/investor/portfolio" },
      { title: "Theses", description: "Investment theses", href: "/investor/theses" },
    ],
    quickActions: [
      { label: "Create investment memo", command: "Create investment memo" },
      { label: "Diligence checklist", command: "Generate diligence checklist" },
      { label: "Draft founder follow-up", command: "Draft founder follow-up" },
      { label: "IC memo outline", command: "Generate IC memo outline" },
    ],
    workflows: [
      { name: "Investment memo", description: "Informational memo draft", prompt: "Draft an informational investment memo (company, market, team, traction, risks, open questions) from: {context}. Decision support only, not investment advice." },
      { name: "Diligence checklist", description: "Areas to investigate", prompt: "Generate a diligence checklist (team, market, product, traction, financials-to-request, legal, risks) for: {context}" },
      { name: "Founder follow-up", description: "Post-meeting follow-up", prompt: "Draft a founder follow-up with specific questions and next steps from: {context}. Draft only; do not send." },
      { name: "IC memo outline", description: "Investment committee outline", prompt: "Create an IC memo outline (thesis fit, recommendation framing, key risks, diligence gaps) for: {context}. Informational only." },
    ],
    commandSuggestions: ["Create investment memo", "Summarize founder meeting", "Generate diligence checklist", "Draft founder follow-up", "Compare companies", "Generate IC memo outline"],
  },
};

export const ROLE_IDS = Object.keys(ROLES) as RoleId[];

export function isRoleId(value: string): value is RoleId {
  return (ROLE_IDS as string[]).includes(value);
}

export function getRole(role: string): RoleDefinition {
  return isRoleId(role) ? ROLES[role] : ROLES[DEFAULT_ROLE];
}

export const ROLE_GROUPS: { id: RoleDefinition["group"]; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "technical", label: "Technical" },
  { id: "leadership", label: "Leadership" },
  { id: "investing", label: "Investing" },
];
