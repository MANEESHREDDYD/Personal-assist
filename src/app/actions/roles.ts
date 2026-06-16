"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { ROLES, DEFAULT_ROLE, isRoleId, type RoleId } from "@/lib/roles/registry";

const ACTIVE_ROLE_KEY = "ACTIVE_ROLE";

/** Returns the active role id, defaulting to the personal/everyday role. */
export async function getActiveRole(): Promise<RoleId> {
  try {
    const pref = await prisma.userPreference.findUnique({ where: { key: ACTIVE_ROLE_KEY } });
    if (pref && isRoleId(pref.value)) return pref.value;
  } catch {
    // DB may not be ready during build
  }
  return DEFAULT_ROLE;
}

/** Sets the active role, persisting both a preference and a UserRoleProfile. */
export async function setActiveRole(role: string) {
  if (!isRoleId(role)) {
    return { success: false, error: "Unknown role" };
  }
  try {
    await prisma.userPreference.upsert({
      where: { key: ACTIVE_ROLE_KEY },
      update: { value: role },
      create: { key: ACTIVE_ROLE_KEY, value: role },
    });

    // Deactivate other profiles, activate (or create) this one.
    await prisma.userRoleProfile.updateMany({ data: { isActive: false } });
    await prisma.userRoleProfile.upsert({
      where: { role },
      update: { isActive: true },
      create: { role, displayName: ROLES[role].label, isActive: true, onboardedAt: new Date() },
    });

    await seedRoleWorkflowTemplates(role);
    await logAudit("role_selected", "UserRoleProfile", role, { role });

    revalidatePath("/");
    revalidatePath("/roles");
    revalidatePath(`/roles/${role}`);
    revalidatePath("/settings/role-profile");
    return { success: true, role };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message || "Failed to set role" };
  }
}

/** Idempotently seeds the registry's workflow templates for a role into the DB. */
export async function seedRoleWorkflowTemplates(role: string) {
  if (!isRoleId(role)) return { success: false };
  try {
    const existing = await prisma.roleWorkflowTemplate.count({ where: { role } });
    if (existing > 0) return { success: true, seeded: 0 };
    const defs = ROLES[role].workflows;
    for (const wf of defs) {
      await prisma.roleWorkflowTemplate.create({
        data: { role, name: wf.name, description: wf.description, promptTemplate: wf.prompt },
      });
    }
    return { success: true, seeded: defs.length };
  } catch {
    return { success: false };
  }
}

/** Lists role profiles that have been activated at least once. */
export async function listRoleProfiles() {
  try {
    return await prisma.userRoleProfile.findMany({ orderBy: { updatedAt: "desc" } });
  } catch {
    return [];
  }
}

/** Saves a free-form role preference (e.g. dashboard tweaks). */
export async function setRolePreference(role: string, key: string, value: string) {
  if (!isRoleId(role)) return { success: false };
  try {
    await prisma.rolePreference.upsert({
      where: { role_key: { role, key } },
      update: { value },
      create: { role, key, value },
    });
    revalidatePath("/settings/role-profile");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}
