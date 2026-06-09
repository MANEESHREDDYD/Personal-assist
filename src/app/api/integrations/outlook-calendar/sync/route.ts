import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import { fetchCalendarEvents, refreshAccessToken } from "@/lib/integrations/outlookCalendar";
import { encryptToken, decryptToken } from "@/lib/integrations/crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const days = parseInt(body.days || "30", 10);
    
    const account = await db.connectorAccount.findFirst({
      where: { provider: "outlook_calendar" }
    });

    if (!account || account.status !== "connected" || !account.accessTokenEncrypted) {
      return NextResponse.json({ error: "Outlook Calendar is not connected" }, { status: 400 });
    }

    await db.auditLog.create({
      data: {
        action: "outlook_calendar_sync_started",
        entityType: "connector",
        entityId: "outlook_calendar",
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

    const events = await fetchCalendarEvents(accessToken, timeMin, timeMax);
    const calendarId = account.email || "primary";

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const event of events) {
      const externalId = `outlook_calendar:${calendarId}:${event.id}`;
      
      const existing = await db.calendarEvent.findUnique({
        where: { externalId }
      });

      if (event.isCancelled) {
        if (existing) {
          await db.calendarEvent.update({
            where: { id: existing.id },
            data: { 
              status: "cancelled",
              source: "outlook_calendar"
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
              action: "outlook_calendar_event_cancelled",
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
      let startDateStr = event.start?.dateTime;
      let endDateStr = event.end?.dateTime;
      let isAllDay = !!event.isAllDay;

      if (!startDateStr) {
        skipped++;
        continue;
      }

      const startDate = new Date(startDateStr + "Z"); // Graph returns times as UTC if properly mapped, usually ends in Z or has timezone. We append Z to ensure UTC parsing.
      const endDate = endDateStr ? new Date(endDateStr + "Z") : new Date(startDate.getTime() + 60*60*1000);

      // Extract Meeting Links
      let meetingLink = event.onlineMeeting?.joinUrl || null;
      if (!meetingLink && (event.location?.displayName || event.bodyPreview)) {
        const urlRegex = /(https:\/\/(?:zoom\.us|teams\.microsoft\.com|meet\.google\.com|webex\.com)[^\s]+)/gi;
        const textToSearch = `${event.location?.displayName || ""} ${event.bodyPreview || ""}`;
        const match = urlRegex.exec(textToSearch);
        if (match) {
          meetingLink = match[1];
        }
      }

      // Organizer & Attendees
      const organizerEmail = event.organizer?.emailAddress?.address || null;
      const organizerName = event.organizer?.emailAddress?.name || null;
      
      const attendeesData = event.attendees ? event.attendees.map((a: any) => ({
        name: a.emailAddress?.name,
        email: a.emailAddress?.address,
        responseStatus: a.status?.response
      })) : [];
      const attendees = attendeesData.length > 0 ? JSON.stringify(attendeesData) : null;

      // Extract Contacts
      const contactsToUpsert = [];
      if (organizerEmail && organizerEmail !== account.email) {
        contactsToUpsert.push({ email: organizerEmail, name: organizerName || organizerEmail });
      }
      if (attendeesData) {
        for (const a of attendeesData) {
          if (a.email && a.email !== account.email) {
            contactsToUpsert.push({ email: a.email, name: a.name || a.email });
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
              source: "outlook_calendar",
              lastInteraction: startDate
            }
          });
        }
      }

      const title = event.subject || "Untitled Event";
      const location = event.location?.displayName || null;
      const description = event.bodyPreview || null;
      const status = event.showAs || null;
      const metadata = JSON.stringify({ isAllDay, webLink: event.webLink, recurrence: event.recurrence });

      if (existing) {
        await db.calendarEvent.update({
          where: { id: existing.id },
          data: {
            title,
            description,
            location,
            startDate,
            endDate,
            organizer: organizerEmail,
            attendees,
            meetingLink,
            status,
            metadata,
            source: "outlook_calendar"
          }
        });

        if (existing.relatedCardId) {
          await db.walletCard.update({
            where: { id: existing.relatedCardId },
            data: {
              title,
              date: startDate,
              location,
              metadata
            }
          });
        }

        updated++;
        await db.auditLog.create({
          data: {
            action: "outlook_calendar_event_updated",
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
            source: "outlook_calendar",
            date: startDate,
            location,
            metadata
          }
        });

        const newEvent = await db.calendarEvent.create({
          data: {
            externalId,
            title,
            description,
            location,
            startDate,
            endDate,
            organizer: organizerEmail,
            attendees,
            meetingLink,
            source: "outlook_calendar",
            status,
            metadata,
            relatedCardId: card.id
          }
        });

        imported++;
        await db.auditLog.create({
          data: {
            action: "outlook_calendar_event_imported",
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
        title: "Outlook Calendar Sync Complete",
        message: `Imported ${imported}, updated ${updated}, skipped ${skipped} events.`,
        type: "system_alert",
        severity: "success",
        status: "unread",
        relatedEntityType: "connector",
        relatedEntityId: "outlook_calendar"
      }
    });

    await db.auditLog.create({
      data: {
        action: "outlook_calendar_sync_completed",
        entityType: "connector",
        entityId: "outlook_calendar",
        details: JSON.stringify({ imported, updated, skipped })
      }
    });

    return NextResponse.json({ success: true, imported, updated, skipped });

  } catch (error: any) {
    console.error("Outlook Calendar Sync Error:", error);
    
    await db.notification.create({
      data: {
        title: "Outlook Calendar Sync Failed",
        message: error.message,
        type: "system_alert",
        severity: "error",
        status: "unread"
      }
    });

    await db.auditLog.create({
      data: {
        action: "outlook_calendar_sync_failed",
        entityType: "connector",
        entityId: "outlook_calendar",
        details: JSON.stringify({ error: error.message })
      }
    });

    const account = await db.connectorAccount.findFirst({
      where: { provider: "outlook_calendar" }
    });
    if (account) {
      await db.connectorAccount.update({
        where: { id: account.id },
        data: { lastError: error.message }
      });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
