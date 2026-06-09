import { prisma } from "@/lib/prisma";
import { CalendarClient } from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const events = await prisma.calendarEvent.findMany({
    orderBy: { startDate: 'asc' }
  });

  return <CalendarClient events={events} />;
}
