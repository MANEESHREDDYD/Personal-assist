"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import ical from "node-ical";

export async function importICS(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };

    const text = await file.text();
    const parsed = ical.parseICS(text);
    
    let importCount = 0;

    for (const k in parsed) {
      if (Object.prototype.hasOwnProperty.call(parsed, k)) {
        const ev = parsed[k];
        if (ev && ev.type === 'VEVENT') {
          const summary = ev.summary ? (typeof ev.summary === 'string' ? ev.summary : (ev.summary as any).val) : "Untitled Event";
          const location = ev.location ? (typeof ev.location === 'string' ? ev.location : (ev.location as any).val) : "";
          const description = ev.description ? (typeof ev.description === 'string' ? ev.description : (ev.description as any).val) : "";
          const meetingLink = ev.url ? (typeof ev.url === 'string' ? ev.url : (ev.url as any).val) : "";

          // Check if event already exists to prevent duplicate imports (basic check on title and start time)
          const existing = await prisma.calendarEvent.findFirst({
            where: {
              title: summary,
              startDate: ev.start as Date,
            }
          });

          if (!existing) {
            const organizer = ev.organizer ? (typeof ev.organizer === 'string' ? ev.organizer : (ev.organizer as any).val) : null;
            const attendees = ev.attendee ? (Array.isArray(ev.attendee) ? ev.attendee.map((a: any) => typeof a === 'string' ? a : a.val).join(", ") : (typeof ev.attendee === 'string' ? ev.attendee : (ev.attendee as any).val)) : null;

            // Create Calendar Event
            const calEvent = await prisma.calendarEvent.create({
              data: {
                title: summary,
                description: description,
                location: location,
                startDate: ev.start as Date,
                endDate: ev.end as Date,
                organizer,
                attendees: attendees ? JSON.stringify({ raw: attendees }) : null,
                meetingLink: meetingLink,
                source: "imported_ics",
              }
            });

            // Create WalletCard
            await prisma.walletCard.create({
              data: {
                type: "meeting",
                title: summary,
                category: "Calendar",
                status: "Upcoming",
                date: ev.start as Date,
                location: location,
                metadata: JSON.stringify({ eventId: calEvent.id, organizer }),
                source: "imported_ics"
              }
            });

            // Opportunistically try to create Contacts for Organizer/Attendees
            if (organizer) {
              const emailStr = organizer.replace("mailto:", "");
              const existingContact = await prisma.contact.findFirst({ where: { email: emailStr } });
              if (!existingContact) {
                await prisma.contact.create({
                  data: {
                    name: emailStr.split("@")[0],
                    email: emailStr,
                    source: "imported_ics",
                    tags: JSON.stringify(["meeting_organizer"])
                  }
                });
              }
            }

            importCount++;
          }
        }
      }
    }

    if (importCount > 0) {
      await logAudit("calendar_imported", "CalendarEvent", "multiple", { count: importCount, filename: file.name });
      revalidatePath("/calendar");
      revalidatePath("/wallet");
      revalidatePath("/");
    }

    return { success: true, count: importCount };
  } catch (error) {
    console.error("Failed to import ICS", error);
    return { success: false, error: "Failed to parse ICS file." };
  }
}
