/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. WalletCards (3 payments, 2 travel, 2 tickets, 3 orders, 3 documents, 3 reminders, 3 stocks)
  const cards = [
    { type: 'payment', title: 'Rent Payment', category: 'Housing', status: 'Pending', amount: 1500.00, date: new Date(Date.now() + 86400000 * 3), source: 'Bank Transfer' },
    { type: 'payment', title: 'Electric Bill', category: 'Utilities', status: 'Pending', amount: 120.50, date: new Date(Date.now() + 86400000 * 5), source: 'Credit Card' },
    { type: 'payment', title: 'Internet Service', category: 'Utilities', status: 'Paid', amount: 79.99, date: new Date(Date.now() - 86400000 * 2), source: 'Credit Card' },
    
    { type: 'travel', title: 'Flight to NYC', category: 'Travel', status: 'Upcoming', date: new Date(Date.now() + 86400000 * 14), location: 'JFK', metadata: JSON.stringify({ flightNumber: 'DL402' }) },
    { type: 'travel', title: 'Hotel Booking - Marriott', category: 'Travel', status: 'Upcoming', date: new Date(Date.now() + 86400000 * 14), location: 'NYC', metadata: JSON.stringify({ reservationCode: 'X89Q12' }) },
    
    { type: 'ticket', title: 'Coldplay Concert', category: 'Entertainment', status: 'Valid', date: new Date(Date.now() + 86400000 * 30), location: 'MetLife Stadium' },
    { type: 'ticket', title: 'Tech Conference 2026', category: 'Professional', status: 'Valid', date: new Date(Date.now() + 86400000 * 45), location: 'Moscone Center' },
    
    { type: 'order', title: 'MacBook Pro M5', category: 'Electronics', status: 'Shipped', date: new Date(), source: 'Apple Store', metadata: JSON.stringify({ trackingNumber: '1Z9999999999999999' }) },
    { type: 'order', title: 'Standing Desk', category: 'Furniture', status: 'Delivered', date: new Date(Date.now() - 86400000 * 5), source: 'Amazon' },
    { type: 'order', title: 'Ergonomic Chair', category: 'Furniture', status: 'Processing', date: new Date(Date.now() - 86400000 * 1), source: 'Herman Miller' },
    
    { type: 'document', title: 'Lease Agreement 2026.pdf', category: 'Legal', status: 'Needs Signature', date: new Date(), metadata: JSON.stringify({ documentId: 'doc_1' }) },
    { type: 'document', title: 'Tax Return 2025.pdf', category: 'Finance', status: 'Completed', date: new Date(Date.now() - 86400000 * 40), metadata: JSON.stringify({ documentId: 'doc_2' }) },
    { type: 'document', title: 'Offer Letter.pdf', category: 'Career', status: 'Needs Review', date: new Date(), metadata: JSON.stringify({ documentId: 'doc_3' }) },
    
    { type: 'reminder', title: 'Call Mom', category: 'Personal', status: 'Pending', date: new Date(Date.now() + 86400000 * 1) },
    { type: 'reminder', title: 'Cancel Netflix Trial', category: 'Subscriptions', status: 'Pending', date: new Date(Date.now() + 86400000 * 6) },
    { type: 'reminder', title: 'Doctor Appointment', category: 'Health', status: 'Pending', date: new Date(Date.now() + 86400000 * 10), location: 'City Clinic' },
    
    { type: 'stock', title: 'AAPL', category: 'Watchlist', status: 'Watching', metadata: JSON.stringify({ reason: 'WWDC Announcements' }) },
    { type: 'stock', title: 'NVDA', category: 'Watchlist', status: 'Watching', metadata: JSON.stringify({ reason: 'Earnings report soon' }) },
    { type: 'stock', title: 'TSLA', category: 'Watchlist', status: 'Watching', metadata: JSON.stringify({ reason: 'Robotaxi update' }) },
  ];

  for (const card of cards) {
    await prisma.walletCard.create({ data: card });
  }

  // 2. Documents
  const docs = [
    { id: 'doc_1', filename: 'lease_agreement_2026.pdf', originalName: 'Lease Agreement 2026.pdf', mimeType: 'application/pdf', size: 1024000, path: '/api/files/lease_agreement_2026.pdf', status: 'needs_signature', aiSummary: '12-month lease agreement starting July 1st. Rent is $1500/mo.' },
    { id: 'doc_2', filename: 'tax_return_2025.pdf', originalName: 'Tax Return 2025.pdf', mimeType: 'application/pdf', size: 2500000, path: '/api/files/tax_return_2025.pdf', status: 'completed', aiSummary: 'Filed tax return for 2025. Refund amount: $1200.' },
    { id: 'doc_3', filename: 'offer_letter.pdf', originalName: 'Offer Letter.pdf', mimeType: 'application/pdf', size: 500000, path: '/api/files/offer_letter.pdf', status: 'needs_review', aiSummary: 'Full-time Software Engineer offer. Base salary: $150,000. Expires in 3 days.' },
  ];
  for (const doc of docs) {
    await prisma.document.create({ data: doc });
  }

  // 3. Approval Requests
  const approvals = [
    { actionType: 'Wire Transfer', description: 'Initiate rent payment of $1500 to Landlord LLC.', status: 'pending', metadata: JSON.stringify({ riskLevel: 'High' }) },
    { actionType: 'Sign Document', description: 'Apply signature to Lease Agreement 2026.pdf', status: 'pending', metadata: JSON.stringify({ riskLevel: 'Medium' }) },
    { actionType: 'Send Email', description: 'Send follow-up email to recruiter regarding offer letter.', status: 'approved', metadata: JSON.stringify({ riskLevel: 'Low' }) },
  ];
  for (const approval of approvals) {
    await prisma.approvalRequest.create({ data: approval });
  }

  // 4. Reminders
  const reminders = [
    { title: 'Call Mom', description: 'Wish her a happy birthday.', dueDate: new Date(Date.now() + 86400000 * 1), status: 'pending' },
    { title: 'Cancel Netflix Trial', description: 'Trial ends in 7 days.', dueDate: new Date(Date.now() + 86400000 * 6), status: 'pending' },
    { title: 'Doctor Appointment', description: 'Annual physical checkup.', dueDate: new Date(Date.now() + 86400000 * 10), status: 'pending' },
  ];
  for (const reminder of reminders) {
    await prisma.reminder.create({ data: reminder });
  }

  // 5. Inbox Items
  const inboxItems = [
    { subject: 'Your Amazon.com order of "Standing Desk"', body: 'Your order has shipped. Tracking number: TBA1234567890.', sender: 'shipment-tracking@amazon.com', category: 'Order', isProcessed: true, metadata: JSON.stringify({ confidenceScore: 0.95, extractedEntities: { trackingNumber: 'TBA1234567890', amount: null } }) },
    { subject: 'Upcoming Flight: DL402 to JFK', body: 'Your flight to New York (JFK) departs in 14 days. Confirmation: X89Q12.', sender: 'delta@delta.com', category: 'Travel', isProcessed: true, metadata: JSON.stringify({ confidenceScore: 0.88, extractedEntities: { flightNumber: 'DL402', confirmationNumber: 'X89Q12' } }) },
  ];
  for (const item of inboxItems) {
    await prisma.inboxItem.create({ data: item });
  }

  // 6. Briefs
  const briefs = [
    { type: 'daily_start', content: JSON.stringify({ meetingsToday: '10:00 AM - Design Sync | 2:00 PM - Strategy Review', paymentsDue: '1 payment pending ($1500 Rent)', documentsNeedingReview: 'Offer Letter.pdf needs review', topPriorityActions: '1. Review Offer Letter 2. Approve Rent Payment' }) },
    { type: 'daily_end', content: JSON.stringify({ completedItems: 'Design sync, Strategy review', pendingApprovals: '2 requests waiting for approval.', upcomingPayments: 'Electric bill due in 5 days.', reminders: 'Call Mom tomorrow.' }) },
  ];
  for (const brief of briefs) {
    await prisma.brief.create({ data: brief });
  }

  // 7. Audit Logs
  const auditLogs = [
    { action: 'card_created', entityType: 'WalletCard', entityId: 'card_xyz', details: JSON.stringify({ actor: 'System', description: 'Auto-extracted Order from email.' }) },
    { action: 'file_uploaded', entityType: 'Document', entityId: 'doc_1', details: JSON.stringify({ actor: 'User', description: 'Uploaded lease_agreement_2026.pdf' }) },
    { action: 'brief_generated', entityType: 'Brief', entityId: 'brief_1', details: JSON.stringify({ actor: 'System', description: 'Generated daily start brief.' }) },
    { action: 'approval_status_updated', entityType: 'ApprovalRequest', entityId: 'req_1', details: JSON.stringify({ actor: 'User', description: 'Approved Send Email request.' }) },
    { action: 'stock_added', entityType: 'WalletCard', entityId: 'card_abc', details: JSON.stringify({ actor: 'User', description: 'Added AAPL to watchlist.' }) },
  ];
  for (const log of auditLogs) {
    await prisma.auditLog.create({ data: log });
  }

  // 8. Contacts
  const contacts = [
    { name: 'John Doe', email: 'john.doe@example.com', company: 'Acme Corp', role: 'Recruiter', tags: '["career", "important"]', source: 'manual' },
    { name: 'Jane Smith', email: 'jane.smith@example.com', phone: '555-0199', relationshipType: 'friend', source: 'manual' },
  ];
  for (const c of contacts) {
    await prisma.contact.create({ data: c });
  }

  // 9. Calendar Events
  const events = [
    { title: 'Weekly Sync', description: 'Team sync meeting', location: 'Zoom', startDate: new Date(Date.now() + 3600000), endDate: new Date(Date.now() + 7200000), organizer: 'boss@example.com', source: 'imported_ics' },
    { title: 'Interview with Acme Corp', startDate: new Date(Date.now() + 86400000), endDate: new Date(Date.now() + 90000000), source: 'imported_ics' }
  ];
  for (const e of events) {
    await prisma.calendarEvent.create({ data: e });
  }

  // 10. Email Drafts
  const drafts = [
    { type: 'follow_up', to: 'john.doe@example.com', subject: 'Following up on offer', body: 'Hi John, thanks for the offer. I will review and sign it shortly.', status: 'draft' }
  ];
  for (const d of drafts) {
    await prisma.emailDraft.create({ data: d });
  }

  // 11. FollowUps
  const followups = [
    { title: 'Send signed offer letter', reason: 'Due in 3 days', status: 'pending', priority: 'high', source: 'document' }
  ];
  for (const f of followups) {
    await prisma.followUp.create({ data: f });
  }

  // 12. Notifications
  const notifications = [
    { title: 'Rent Due Soon', message: 'Your rent payment of $1500 is due in 3 days.', type: 'payment_due', severity: 'warning', status: 'unread' },
    { title: 'Offer Letter Needs Review', message: 'You have an offer letter pending review.', type: 'document_review', severity: 'info', status: 'unread' }
  ];
  for (const n of notifications) {
    await prisma.notification.create({ data: n });
  }

  // 13. Document Versions
  const docVersions = [
    { documentId: 'doc_1', versionNumber: 1, type: 'original', title: 'Original Upload', createdBy: 'user', content: 'This is the original text of the lease agreement...' },
    { documentId: 'doc_1', versionNumber: 2, type: 'extracted_text', title: 'Extracted Text', createdBy: 'system', content: 'Lease Agreement 2026. 12 months. $1500.' },
    { documentId: 'doc_1', versionNumber: 3, type: 'edited_text', title: 'Professional Edit', createdBy: 'ai_provider', content: 'Lease Agreement 2026. Term: 12 months. Rent: $1500.' },
  ];
  for (const v of docVersions) {
    await prisma.documentVersion.create({ data: v });
  }

  // 14. Document Signers
  const signers = [
    { documentId: 'doc_1', name: 'Landlord LLC', email: 'landlord@example.com', role: 'Landlord', status: 'sent', signingOrder: 1 },
    { documentId: 'doc_1', name: 'John Doe', email: 'john@example.com', role: 'Tenant', status: 'pending', signingOrder: 2 },
  ];
  for (const s of signers) {
    await prisma.documentSigner.create({ data: s });
  }

  // 15. Signature Fields
  // I need to fetch the signers to link them.
  const landlord = await prisma.documentSigner.findFirst({ where: { email: 'landlord@example.com' } });
  const tenant = await prisma.documentSigner.findFirst({ where: { email: 'john@example.com' } });

  if (landlord && tenant) {
    const fields = [
      { documentId: 'doc_1', signerId: landlord.id, type: 'signature', label: 'Landlord Signature', pageNumber: 1, isRequired: true },
      { documentId: 'doc_1', signerId: tenant.id, type: 'signature', label: 'Tenant Signature', pageNumber: 1, isRequired: true },
    ];
    for (const f of fields) {
      await prisma.signatureField.create({ data: f });
    }
  }

  // 16. Automation Rules
  const automationRules = [
    { name: "Daily Life Brief", description: "Generate brief at 8:00 AM", triggerType: "daily_brief_time" },
    { name: "End-of-Day Brief", description: "Generate brief at 7:00 PM", triggerType: "end_of_day_brief_time" },
    { name: "Stock Open Brief", description: "Generate brief at 9:00 AM NY time", triggerType: "stock_open_brief_time" },
    { name: "Stock Close Brief", description: "Generate brief at 4:15 PM NY time", triggerType: "stock_close_brief_time" },
    { name: "Reminder Due Notification", description: "Notify when reminder is due", triggerType: "reminder_due" },
    { name: "Payment Due Soon", description: "Notify 3 days before payment", triggerType: "payment_due_soon" },
    { name: "Signer Follow-Up", description: "Follow up if signer has not signed after 3 days", triggerType: "signer_not_signed" },
    { name: "Approval Pending", description: "Notify if approval pending > 24h", triggerType: "approval_pending_too_long" },
    { name: "Travel Upcoming", description: "Notify 24h before travel", triggerType: "travel_upcoming" },
    { name: "Calendar Event Upcoming", description: "Notify 30 mins before event", triggerType: "calendar_event_upcoming" },
    { name: "Follow-Up Due", description: "Notify when follow up is due", triggerType: "followup_due" },
    { name: "Weekly Backup", description: "Reminder for local backup", triggerType: "weekly_backup_reminder" }
  ];
  for (const rule of automationRules) {
    await prisma.automationRule.create({ data: rule });
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
