import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import { fetchEvents, refreshAccessToken } from "@/lib/integrations/googleCalendar";
import { encryptToken, decryptToken } from "@/lib/integrations/crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const days = parseInt(body.days || "30", 10);
    
    const account = await db.connectorAccount.findFirst({
      where: { provider: "google_calendar" }
    });

    if (!account || account.status !== "connected" || !account.accessTokenEncrypted) {
      return NextResponse.json({ error: "Google Calendar is not connected" }, { status: 400 });
    }

    await db.auditLog.create({
      data: {
        action: "google_calendar_sync_started",
        entityType: "connector",
        entityId: "google_calendar",
        details: JSON.stringify({ days })
      }
    });

    let accessToken = decryptToken(account.accessTokenEncrypted);
    
    // Check if token is expired or expires in next 5 minutes
    const now = new Date();
    if (account.tokenExpiry && new Date(account.tokenExpiry.getTime() - 5 * 60000) < now) {
      if (!account.refreshTokenEncrypted) {
        throw new Error("Token expired and no refresh token available");
      }
      
      const refreshToken = decryptToken(account.refreshTokenEncrypted);
      const tokenData = await refreshAccessToken(refreshToken);
      
      accessToken = tokenData.access_token;
      const encryptedAccess = encryptToken(accessToken);
      const expiryDate = new Date(Date.now() + tokenData.expires_in * 1000);
      
      let encryptedRefresh = account.refreshTokenEncrypted;
      if (tokenData.refresh_token) {
        encryptedRefresh = encryptToken(tokenData.refresh_token);
      }

      await db.connectorAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEncrypted: encryptedAccess,
          refreshTokenEncrypted: encryptedRefresh,
          tokenExpiry: expiryDate
        }
      });
    }

    const timeMin = new Date();
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + days);

    const events = await fetchEvents(accessToken, timeMin, timeMax);
    const calendarId = account.email || "primary";

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const event of events) {
      const externalId = `google_calendar:${calendarId}:${event.id}`;
      
      const existing = await db.calendarEvent.findUnique({
        where: { externalId }
      });

      if (event.status === "cancelled") {
        if (existing) {
          await db.calendarEvent.update({
            where: { id: existing.id },
            data: { 
              status: "cancelled",
              source: "google_calendar"
            }
          });
          
          if (existing.relatedCardId) {
            await db.walletCard.update({
              where: { id: existing.relatedCardId },
              data: { status: "cancelled" }
            });
          }
          
          await db.auditLog.create({
            data: {
              action: "google_calendar_event_cancelled",
              entityType: "calendar_event",
              entityId: existing.id,
              details: JSON.stringify({ externalId })
            }
          });
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      // Parse dates
      const startDateStr = event.start?.dateTime || event.start?.date;
      const endDateStr = event.end?.dateTime || event.end?.date;
      const isAllDay = !!event.start?.date;

      if (!startDateStr) {
        skipped++;
        continue;
      }

      const startDate = new Date(startDateStr);
      const endDate = endDateStr ? new Date(endDateStr) : new Date(startDate.getTime() + 60*60*1000);

      // Extract Meeting Links
      let meetingLink = event.hangoutLink || null;
      if (!meetingLink && (event.location || event.description)) {
        const urlRegex = /(https:\/\/(?:zoom\.us|teams\.microsoft\.com|meet\.google\.com|webex\.com)[^\s]+)/gi;
        const textToSearch = `${event.location || ""} ${event.description || ""}`;
        const match = urlRegex.exec(textToSearch);
        if (match) {
          meetingLink = match[1];
        }
      }

      // Organizer & Attendees
      const organizer = event.organizer?.email || null;
      const attendees = event.attendees ? JSON.stringify(event.attendees.map((a: any) => ({ name: a.displayName, email: a.email, responseStatus: a.responseStatus }))) : null;

      // Extract Contacts
      const contactsToUpsert = [];
      if (event.organizer && event.organizer.email && event.organizer.email !== account.email) {
        contactsToUpsert.push({ email: event.organizer.email, name: event.organizer.displayName || event.organizer.email });
      }
      if (event.attendees) {
        for (const a of event.attendees) {
          if (a.email && a.email !== account.email && !a.resource) {
            contactsToUpsert.push({ email: a.email, name: a.displayName || a.email });
          }
        }
      }

      for (const c of contactsToUpsert) {
        const existingContact = await db.contact.findFirst({ where: { email: c.email } });
        if (existingContact) {
          await db.contact.update({
            where: { id: existingContact.id },
            data: { lastInteraction: startDate }
          });
        } else {
          await db.contact.create({
            data: {
              name: c.name,
              email: c.email,
              source: "google_calendar",
              lastInteraction: startDate
            }
          });
        }
      }

      const title = event.summary || "Untitled Event";
      
      if (existing) {
        await db.calendarEvent.update({
          where: { id: existing.id },
          data: {
            title,
            description: event.description || null,
            location: event.location || null,
            startDate,
            endDate,
            organizer,
            attendees,
            meetingLink,
            status: event.status,
            metadata: JSON.stringify({ isAllDay, recurringEventId: event.recurringEventId }),
            source: "google_calendar"
          }
        });

        if (existing.relatedCardId) {
          await db.walletCard.update({
            where: { id: existing.relatedCardId },
            data: {
              title,
              date: startDate,
              location: event.location || null,
              metadata: JSON.stringify({ isAllDay, recurringEventId: event.recurringEventId })
            }
          });
        }

        updated++;
        await db.auditLog.create({
          data: {
            action: "google_calendar_event_updated",
            entityType: "calendar_event",
            entityId: existing.id
          }
        });
      } else {
        const card = await db.walletCard.create({
          data: {
            type: "meeting",
            title,
            category: "Calendar",
            status: "active",
            source: "google_calendar",
            date: startDate,
            location: event.location || null,
            metadata: JSON.stringify({ isAllDay, recurringEventId: event.recurringEventId })
          }
        });

        const newEvent = await db.calendarEvent.create({
          data: {
            externalId,
            title,
            description: event.description || null,
            location: event.location || null,
            startDate,
            endDate,
            organizer,
            attendees,
            meetingLink,
            source: "google_calendar",
            status: event.status,
            metadata: JSON.stringify({ isAllDay, recurringEventId: event.recurringEventId }),
            relatedCardId: card.id
          }
        });

        imported++;
        await db.auditLog.create({
          data: {
            action: "google_calendar_event_imported",
            entityType: "calendar_event",
            entityId: newEvent.id
          }
        });
      }
    }

    await db.connectorAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date(), lastError: null }
    });

    await db.notification.create({
      data: {
        title: "Google Calendar Sync Complete",
        message: `Imported ${imported}, updated ${updated}, skipped ${skipped} events.`,
        type: "system_alert",
        severity: "success",
        status: "unread",
        relatedEntityType: "connector",
        relatedEntityId: "google_calendar"
      }
    });

    await db.auditLog.create({
      data: {
        action: "google_calendar_sync_completed",
        entityType: "connector",
        entityId: "google_calendar",
        details: JSON.stringify({ imported, updated, skipped })
      }
    });

    return NextResponse.json({ success: true, imported, updated, skipped });

  } catch (error: unknown) {
    console.error("Google Calendar Sync Error:", error);
    
    await db.notification.create({
      data: {
        title: "Google Calendar Sync Failed",
        message: (error as Error).message,
        type: "system_alert",
        severity: "error",
        status: "unread"
      }
    });

    await db.auditLog.create({
      data: {
        action: "google_calendar_sync_failed",
        entityType: "connector",
        entityId: "google_calendar",
        details: JSON.stringify({ error: (error as Error).message })
      }
    });

    const account = await db.connectorAccount.findFirst({
      where: { provider: "google_calendar" }
    });
    if (account) {
      await db.connectorAccount.update({
        where: { id: account.id },
        data: { lastError: (error as Error).message }
      });
    }

    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
