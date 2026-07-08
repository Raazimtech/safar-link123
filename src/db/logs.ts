import { db } from './index.ts';
import { activityLogs } from './schema.ts';

export async function logActivity(
  userId: number | null,
  email: string | null,
  action: string,
  details: string,
  branchId: number | null,
  ip?: string
) {
  try {
    await db.insert(activityLogs).values({
      userId,
      email,
      action,
      details,
      branchId,
      ip: ip || null,
    });
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}
