"use server"

import { auditLogs } from "@/lib/db/schema"
import { db } from "@/lib/db"

type AuditInput = {
  actorId?: string | null
  action: string
  targetType: string
  targetId?: string | null
  metadata?: Record<string, unknown>
}

export async function writeAuditLog({
  actorId,
  action,
  targetType,
  targetId,
  metadata,
}: AuditInput) {
  await db.insert(auditLogs).values({
    actorId: actorId ?? null,
    action,
    targetType,
    targetId: targetId ?? null,
    metadata: metadata ? JSON.stringify(metadata) : null,
  })
}
