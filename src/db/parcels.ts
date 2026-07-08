import { db } from './index.ts';
import { parcels, schedules, branches } from './schema.ts';
import { eq, and, lte, or } from 'drizzle-orm';

/**
 * Automatically updates departed schedules and their associated parcels
 * if they have been on the road for more than the designated travel time (default: 3 hours).
 */
export async function triggerAutoArrivals(travelTimeHours = 3) {
  try {
    const travelTimeMs = travelTimeHours * 60 * 60 * 1000;
    const thresholdTime = new Date(Date.now() - travelTimeMs);

    // 1. Find schedules that are 'Departed' and whose departure_time was more than 3 hours ago
    const departedSchedules = await db.select()
      .from(schedules)
      .where(and(
        eq(schedules.status, 'Departed'),
        lte(schedules.departureTime, thresholdTime)
      ));

    for (const sched of departedSchedules) {
      // Update schedule status to 'Arrived'
      await db.update(schedules)
        .set({ status: 'Arrived' })
        .where(eq(schedules.id, sched.id));

      // Update associated parcels from 'On The Way' to 'Arrived'
      await db.update(parcels)
        .set({ status: 'Arrived' })
        .where(and(
          eq(parcels.busId, sched.id),
          eq(parcels.status, 'On The Way')
        ));
    }
  } catch (err) {
    console.error('Error during auto-arrival trigger:', err);
  }
}

/**
 * Generates a professional, unique tracking number for a parcel.
 * Format: SL-{SendingBranchCode}-{DestinationBranchCode}-{RandomDigits}
 */
export async function generateTrackingNumber(sendingBranchId: number, destinationBranchId: number): Promise<string> {
  try {
    const sBranch = await db.select().from(branches).where(eq(branches.id, sendingBranchId)).limit(1);
    const dBranch = await db.select().from(branches).where(eq(branches.id, destinationBranchId)).limit(1);
    
    const sCode = sBranch[0]?.code || 'HGA';
    const dCode = dBranch[0]?.code || 'BRM';
    
    const randomDigits = Math.floor(100000 + Math.random() * 900000); // 6 digits
    
    return `SL-${sCode}-${dCode}-${randomDigits}`;
  } catch (err) {
    console.error('Error generating tracking number:', err);
    return `SL-${Math.floor(10000000 + Math.random() * 90000000)}`;
  }
}
