/** Agreement template helpers (Phase 6F). Pure. */

export interface TemplateDefaults {
  recipients?: { role: string; order: number; required?: boolean }[];
  fields?: { type: string; label?: string; page?: number; x?: number; y?: number; required?: boolean; recipientRole?: string }[];
}

/** A couple of honest starter templates (local agreement workflow). */
export const STARTER_TEMPLATES: { title: string; description: string; content: string; defaults: TemplateDefaults }[] = [
  {
    title: "Mutual NDA (local)",
    description: "A simple mutual non-disclosure agreement for local signing simulation.",
    content: "This Mutual Non-Disclosure Agreement is made by and between Party A and Party B. Effective date: ____. Each party agrees to keep confidential information confidential. This agreement is governed by the laws of ____. Either party may terminate with 30 days notice.",
    defaults: {
      recipients: [{ role: "Disclosing Party", order: 1 }, { role: "Receiving Party", order: 2 }],
      fields: [
        { type: "signature", label: "Signature", required: true, recipientRole: "Disclosing Party" },
        { type: "date", label: "Date", required: true, recipientRole: "Disclosing Party" },
        { type: "signature", label: "Signature", required: true, recipientRole: "Receiving Party" },
        { type: "date", label: "Date", required: true, recipientRole: "Receiving Party" },
      ],
    },
  },
  {
    title: "Simple Service Agreement (local)",
    description: "A short services agreement scaffold for local signing simulation.",
    content: "This Services Agreement is made by and between Client and Provider. Effective date: ____. Payment terms: Net 30. This agreement automatically renews annually unless either party gives 60 days notice. Governed by the laws of ____.",
    defaults: {
      recipients: [{ role: "Client", order: 1 }, { role: "Provider", order: 2 }],
      fields: [
        { type: "signature", label: "Client signature", required: true, recipientRole: "Client" },
        { type: "initials", label: "Initials", required: false, recipientRole: "Client" },
        { type: "signature", label: "Provider signature", required: true, recipientRole: "Provider" },
      ],
    },
  },
];

export function parseDefaults(json: string | null | undefined): TemplateDefaults {
  if (!json) return {};
  try { return JSON.parse(json) as TemplateDefaults; } catch { return {}; }
}
