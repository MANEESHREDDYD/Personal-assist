import { prisma } from "./prisma";

export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, any>
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
