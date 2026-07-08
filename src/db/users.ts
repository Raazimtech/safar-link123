import { db } from './index.ts';
import { users } from './schema.ts';
import { eq, sql } from 'drizzle-orm';

export async function getUser(uid: string) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    return null;
  } catch (error) {
    console.error('Error in getUser:', error);
    throw new Error('Failed to fetch user profile.', { cause: error });
  }
}

export async function createUser(uid: string, email: string, name: string, inputRole?: string, inputBranchId?: number | null) {
  try {
    // Check if user already exists
    const existing = await getUser(uid);
    if (existing) {
      return existing;
    }

    // Check if this is the first user
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(users);
    const count = Number(countResult[0]?.count || 0);
    const role = inputRole || (count === 0 ? 'Super Admin' : 'Staff');

    let branchId = inputBranchId !== undefined ? inputBranchId : null;

    if (count === 0 && branchId === null) {
      // Create default branches for testing
      const { branches } = await import('./schema.ts');
      const branchCountResult = await db.select({ count: sql<number>`count(*)` }).from(branches);
      if (Number(branchCountResult[0]?.count || 0) === 0) {
        const hga = await db.insert(branches).values({ name: 'Hargeisa HQ', code: 'HGA', location: 'Hargeisa' }).returning();
        await db.insert(branches).values({ name: 'Borama Branch', code: 'BRM', location: 'Borama' });
        await db.insert(branches).values({ name: 'Burao Branch', code: 'BRO', location: 'Burao' });
        branchId = hga[0].id;
      }
    }

    // Insert user
    const result = await db.insert(users)
      .values({
        uid,
        email,
        name: name || email.split('@')[0],
        role,
        branchId,
        status: count === 0 ? 'Active' : 'Pending',
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error in createUser:', error);
    throw new Error('Failed to create user profile.', { cause: error });
  }
}
