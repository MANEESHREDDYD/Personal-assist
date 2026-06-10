# Live Provider Verification — Command Checklist

Run the local gates first, then the live Gmail/Outlook steps with your own accounts.
Record outcomes in a sanitized copy of
[`live-provider-results.template.md`](./live-provider-results.template.md).

## Before live test (local gates)

```bash
git status
npm run security:no-send
npm run lint
npm run build
npm run smoke:test
npm run analytics:run
npm run demo:provider-draft-fixture
npm run test:provider-attachments
```

All of the above must pass before you start live testing. These validate the **local**
gating and no-send policy — they do not contact any provider.

## Live Gmail

1. Connect the **Gmail Draft** connector in `/settings`.
2. Create a local draft and **Approve** it in `/drafts`.
3. Create the **Gmail provider draft**.
4. Confirm it is visible in **Gmail → Drafts**.
5. Confirm **no email was sent** (check Sent; confirm no recipient received anything).
6. Attach a **small** file (≤ 3 MB).
7. Test **duplicate** attachment → blocked.
8. Test **Gmail large** attachment → reported **deferred** (attach manually in Gmail).
9. Record the redacted result.

## Live Outlook

1. Connect the **Outlook Draft** connector in `/settings`.
2. Create a local draft and **Approve** it in `/drafts`.
3. Create the **Outlook provider draft**.
4. Confirm it is visible in **Outlook → Drafts**.
5. Confirm **no email was sent**.
6. Attach a **small** file (≤ 3 MB) — simple flow.
7. Attach a **large** file (> 3 MB and ≤ 150 MB) — upload session flow.
8. Test a **> 150 MB** file → blocked.
9. Test **duplicate** attachment → blocked.
10. Record the redacted result.

## After live test

```bash
npm run analytics:run        # confirm emails_sent stays 0
npm run security:demo-evidence   # scan the evidence folder for raw screenshots / secrets
git status                   # confirm no raw screenshots or private data staged
```

- Update **only** the sanitized results markdown.
- Do **not** commit raw screenshots (they are gitignored — keep local).
- Re-run the git hygiene check before committing.
