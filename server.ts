import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { eq, and, or, like, desc, sql, gte, lte } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import { users, branches, schedules, parcels, finance, activityLogs, settings, notifications } from './src/db/schema.ts';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { triggerAutoArrivals, generateTrackingNumber } from './src/db/parcels.ts';
import { logActivity } from './src/db/logs.ts';
import { createUser } from './src/db/users.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Helper to get travel time settings
  async function getTravelTimeHours() {
    try {
      const config = await db.select().from(settings).limit(1);
      return config[0]?.travelTimeHours || 3;
    } catch {
      return 3;
    }
  }

  // API Route: Healthcheck
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  // API Route: Me (Current User Postgres Profile)
  app.get('/api/me', requireAuth, (req: AuthRequest, res) => {
    res.json(req.user || { error: 'Not synchronized' });
  });

  // API Route: Register
  app.post('/api/register', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.decodedToken) {
        return res.status(401).json({ error: 'Missing token' });
      }
      const dbUser = await createUser(
        req.decodedToken.uid,
        req.decodedToken.email || '',
        req.body.name || req.decodedToken.name || ''
      );
      res.json(dbUser);
    } catch (err: any) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Failed to register user.' });
    }
  });

  // ==========================================
  // BRANCHES API
  // ==========================================
  app.get('/api/branches', requireAuth, async (req: AuthRequest, res) => {
    try {
      const allBranches = await db.select().from(branches).orderBy(branches.name);
      res.json(allBranches);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch branches' });
    }
  });

  app.post('/api/branches', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'Super Admin') {
        return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
      }
      const { name, code, location } = req.body;
      if (!name || !code || !location) {
        return res.status(400).json({ error: 'Name, code, and location are required' });
      }
      const existing = await db.select().from(branches).where(eq(branches.code, code.toUpperCase())).limit(1);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'A branch with this code already exists' });
      }
      const newBranch = await db.insert(branches).values({
        name,
        code: code.toUpperCase(),
        location,
      }).returning();
      
      await logActivity(
        req.user.id,
        req.user.email,
        'Create Branch',
        `Registered branch ${name} (${code}) in ${location}`,
        req.user.branchId,
        req.ip
      );

      res.json(newBranch[0]);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create branch' });
    }
  });

  // ==========================================
  // SETTINGS API
  // ==========================================
  app.get('/api/settings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const config = await db.select().from(settings).limit(1);
      res.json(config[0] || { companyName: 'SafarLink', travelTimeHours: 3, currency: 'USD', theme: 'light' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.put('/api/settings', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'Super Admin' && req.user?.role !== 'Admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }

      const { companyName, theme, travelTimeHours, currency, language } = req.body;

      const existing = await db.select().from(settings).limit(1);
      let updated;
      if (existing.length > 0) {
        updated = await db.update(settings)
          .set({
            companyName: companyName ?? existing[0].companyName,
            theme: theme ?? existing[0].theme,
            travelTimeHours: travelTimeHours ? parseInt(travelTimeHours) : existing[0].travelTimeHours,
            currency: currency ?? existing[0].currency,
            language: language ?? existing[0].language,
          })
          .where(eq(settings.id, existing[0].id))
          .returning();
      } else {
        updated = await db.insert(settings)
          .values({
            companyName: companyName ?? 'SafarLink',
            theme: theme ?? 'light',
            travelTimeHours: travelTimeHours ? parseInt(travelTimeHours) : 3,
            currency: currency ?? 'USD',
            language: language ?? 'en',
          })
          .returning();
      }

      await logActivity(
        req.user.id,
        req.user.email,
        'Update Settings',
        `Updated company name to: ${companyName}, travel hours to: ${travelTimeHours}`,
        req.user.branchId,
        req.ip
      );

      res.json(updated[0]);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // ==========================================
  // USERS API (USER MANAGEMENT)
  // ==========================================
  app.get('/api/users', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'Super Admin' && req.user?.role !== 'Admin') {
        return res.status(403).json({ error: 'Forbidden: Access restricted' });
      }

      let query = db.select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        name: users.name,
        role: users.role,
        branchId: users.branchId,
        status: users.status,
        createdAt: users.createdAt,
        branchName: branches.name,
      })
      .from(users)
      .leftJoin(branches, eq(users.branchId, branches.id))
      .orderBy(desc(users.createdAt));

      // Non-Super Admins can only see users of their own branch
      let results;
      if (req.user.role !== 'Super Admin' && req.user.branchId) {
        results = await query.where(eq(users.branchId, req.user.branchId));
      } else {
        results = await query;
      }

      res.json(results);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'Super Admin' && req.user?.role !== 'Admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }

      const { name, email, password, role, branchId, status } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      // 1. Create in Firebase Auth
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
      });

      // 2. Create in DB
      const dbUser = await createUser(userRecord.uid, email, name, role, branchId);
      
      if (status) {
        await db.update(users).set({ status }).where(eq(users.id, dbUser.id));
        dbUser.status = status;
      }

      await logActivity(
        req.user.id,
        req.user.email,
        'Create User',
        `Created user ${email} with role ${role}`,
        req.user.branchId,
        req.ip
      );

      res.json(dbUser);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Failed to create user' });
    }
  });

  app.delete('/api/users/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'Super Admin') {
        return res.status(403).json({ error: 'Forbidden: Only Super Admin can delete users' });
      }

      const userId = parseInt(req.params.id);
      
      const targetUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (targetUser.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Delete from Firebase
      await adminAuth.deleteUser(targetUser[0].uid);

      // Delete from DB
      await db.delete(users).where(eq(users.id, userId));

      await logActivity(
        req.user.id,
        req.user.email,
        'Delete User',
        `Deleted user ${targetUser[0].email}`,
        req.user.branchId,
        req.ip
      );

      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Failed to delete user' });
    }
  });

  app.put('/api/users/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'Super Admin' && req.user?.role !== 'Admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }

      const userId = parseInt(req.params.id);
      const { role, branchId, status, name, email, password } = req.body;

      // Access validation: Non-Super Admin cannot manage users of other branches
      const targetUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (targetUser.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (req.user.role !== 'Super Admin' && targetUser[0].branchId !== req.user.branchId) {
        return res.status(403).json({ error: 'Forbidden: Cannot update users of other branches' });
      }

      // Update Firebase Auth if email or password is provided
      if (email || password) {
        const updateParams: any = {};
        if (email) updateParams.email = email;
        if (password) updateParams.password = password;
        await adminAuth.updateUser(targetUser[0].uid, updateParams);
      }

      const updated = await db.update(users)
        .set({
          role: role ?? targetUser[0].role,
          branchId: branchId !== undefined ? (branchId === null ? null : parseInt(branchId)) : targetUser[0].branchId,
          status: status ?? targetUser[0].status,
          name: name ?? targetUser[0].name,
          email: email ?? targetUser[0].email,
        })
        .where(eq(users.id, userId))
        .returning();

      await logActivity(
        req.user.id,
        req.user.email,
        'Update User Profile',
        `Modified user id: ${userId} (${targetUser[0].email})`,
        req.user.branchId,
        req.ip
      );

      res.json(updated[0]);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // ==========================================
  // DEPARTURE SCHEDULE API
  // ==========================================
  app.get('/api/schedules', requireAuth, async (req: AuthRequest, res) => {
    try {
      // Trigger automatic transitions first
      const travelHours = await getTravelTimeHours();
      await triggerAutoArrivals(travelHours);

      const userBranch = req.user?.branchId;
      const isSuperAdmin = req.user?.role === 'Super Admin';

      // Load query with branch names
      let query = db.select({
        id: schedules.id,
        busNumber: schedules.busNumber,
        driver: schedules.driver,
        departureBranchId: schedules.departureBranchId,
        arrivalBranchId: schedules.arrivalBranchId,
        departureTime: schedules.departureTime,
        estimatedArrival: schedules.estimatedArrival,
        status: schedules.status,
        availableSeats: schedules.availableSeats,
        totalSeats: schedules.totalSeats,
        price: schedules.price,
        createdAt: schedules.createdAt,
        departureBranchName: sql<string>`dep.name`,
        arrivalBranchName: sql<string>`arr.name`,
      })
      .from(schedules)
      .innerJoin(sql`branches dep`, sql`schedules.departure_branch_id = dep.id`)
      .innerJoin(sql`branches arr`, sql`schedules.arrival_branch_id = arr.id`)
      .orderBy(desc(schedules.departureTime));

      let results;
      if (!isSuperAdmin && userBranch) {
        results = await query.where(or(
          eq(schedules.departureBranchId, userBranch),
          eq(schedules.arrivalBranchId, userBranch)
        ));
      } else {
        results = await query;
      }

      res.json(results);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch schedules' });
    }
  });

  app.post('/api/schedules', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const { busNumber, driver, departureBranchId, arrivalBranchId, departureTime, estimatedArrival, totalSeats, price } = req.body;

      const isSuperAdmin = req.user.role === 'Super Admin';
      const userBranch = req.user.branchId;

      if (!isSuperAdmin && userBranch && parseInt(departureBranchId) !== userBranch) {
        return res.status(403).json({ error: 'Forbidden: You can only schedule departures from your own branch.' });
      }

      const newSchedule = await db.insert(schedules)
        .values({
          busNumber,
          driver,
          departureBranchId: parseInt(departureBranchId),
          arrivalBranchId: parseInt(arrivalBranchId),
          departureTime: new Date(departureTime),
          estimatedArrival: new Date(estimatedArrival),
          totalSeats: parseInt(totalSeats),
          availableSeats: parseInt(totalSeats),
          price: parseInt(price),
          status: 'Scheduled',
        })
        .returning();

      await logActivity(
        req.user.id,
        req.user.email,
        'Create Schedule',
        `Scheduled bus ${busNumber} to drive from branch ${departureBranchId} to ${arrivalBranchId}`,
        req.user.branchId,
        req.ip
      );

      res.json(newSchedule[0]);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create schedule' });
    }
  });

  app.put('/api/schedules/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const scheduleId = parseInt(req.params.id);
      const { status, driver, busNumber, availableSeats } = req.body;

      const sched = await db.select().from(schedules).where(eq(schedules.id, scheduleId)).limit(1);
      if (sched.length === 0) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      const isSuperAdmin = req.user.role === 'Super Admin';
      const userBranch = req.user.branchId;

      if (!isSuperAdmin && userBranch && sched[0].departureBranchId !== userBranch && sched[0].arrivalBranchId !== userBranch) {
        return res.status(403).json({ error: 'Forbidden: You cannot modify schedules outside your branch.' });
      }

      const updateData: any = {};
      if (status) {
        updateData.status = status;
        // If departing now, record actual departure time or handle on-road status
        if (status === 'Departed') {
          updateData.departureTime = new Date();
          const travelHours = await getTravelTimeHours();
          updateData.estimatedArrival = new Date(Date.now() + travelHours * 60 * 60 * 1000);
        }
      }
      if (driver) updateData.driver = driver;
      if (busNumber) updateData.busNumber = busNumber;
      if (availableSeats !== undefined) updateData.availableSeats = parseInt(availableSeats);

      const updated = await db.update(schedules)
        .set(updateData)
        .where(eq(schedules.id, scheduleId))
        .returning();

      // If status updated to Departed, update all associated parcels status to 'On The Way'
      if (status === 'Departed') {
        const updatedParcels = await db.update(parcels)
          .set({
            status: 'On The Way',
            departureTime: new Date(),
            estimatedArrivalTime: updateData.estimatedArrival,
          })
          .where(and(
            eq(parcels.busId, scheduleId),
            eq(parcels.status, 'Registered')
          ))
          .returning();

        // Add notifications for staff of destination branch about departing bus/parcels
        const destStaff = await db.select().from(users).where(eq(users.branchId, sched[0].arrivalBranchId));
        for (const staff of destStaff) {
          await db.insert(notifications).values({
            userId: staff.id,
            title: 'Bus Departed',
            message: `Bus ${sched[0].busNumber} has departed for your branch with ${updatedParcels.length} parcels.`,
            type: 'parcel',
          });
        }
      }

      // If status updated to Arrived, update all associated parcels status to 'Arrived'
      if (status === 'Arrived') {
        await db.update(parcels)
          .set({ status: 'Arrived', receivedAt: new Date() })
          .where(and(
            eq(parcels.busId, scheduleId),
            eq(parcels.status, 'On The Way')
          ));

        const destStaff = await db.select().from(users).where(eq(users.branchId, sched[0].arrivalBranchId));
        for (const staff of destStaff) {
          await db.insert(notifications).values({
            userId: staff.id,
            title: 'Bus Arrived',
            message: `Bus ${sched[0].busNumber} has arrived at your branch. Check pending parcels!`,
            type: 'parcel',
          });
        }
      }

      await logActivity(
        req.user.id,
        req.user.email,
        'Update Schedule',
        `Updated schedule ID ${scheduleId} -> status: ${status}`,
        req.user.branchId,
        req.ip
      );

      res.json(updated[0]);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update schedule' });
    }
  });

  // ==========================================
  // PARCELS MODULE API
  // ==========================================
  app.get('/api/parcels', requireAuth, async (req: AuthRequest, res) => {
    try {
      const travelHours = await getTravelTimeHours();
      await triggerAutoArrivals(travelHours);

      const userBranch = req.user?.branchId;
      const isSuperAdmin = req.user?.role === 'Super Admin';

      let query = db.select({
        id: parcels.id,
        trackingNumber: parcels.trackingNumber,
        senderName: parcels.senderName,
        senderPhone: parcels.senderPhone,
        receiverName: parcels.receiverName,
        receiverPhone: parcels.receiverPhone,
        itemDescription: parcels.itemDescription,
        weight: parcels.weight,
        price: parcels.price,
        sendingBranchId: parcels.sendingBranchId,
        destinationBranchId: parcels.destinationBranchId,
        busId: parcels.busId,
        status: parcels.status,
        departureTime: parcels.departureTime,
        estimatedArrivalTime: parcels.estimatedArrivalTime,
        createdById: parcels.createdById,
        createdAt: parcels.createdAt,
        receivedAt: parcels.receivedAt,
        receivedById: parcels.receivedById,
        notes: parcels.notes,
        archived: parcels.archived,
        sendingBranchName: sql<string>`s_br.name`,
        destinationBranchName: sql<string>`d_br.name`,
        busNumber: sql<string | null>`sch.bus_number`,
        createdByName: sql<string>`usr.name`,
      })
      .from(parcels)
      .innerJoin(sql`branches s_br`, sql`parcels.sending_branch_id = s_br.id`)
      .innerJoin(sql`branches d_br`, sql`parcels.destination_branch_id = d_br.id`)
      .leftJoin(sql`schedules sch`, sql`parcels.bus_id = sch.id`)
      .innerJoin(sql`users usr`, sql`parcels.created_by_id = usr.id`)
      .orderBy(desc(parcels.createdAt));

      let results;
      if (!isSuperAdmin && userBranch) {
        // Staff only see parcels related to their branch
        results = await query.where(or(
          eq(parcels.sendingBranchId, userBranch),
          eq(parcels.destinationBranchId, userBranch)
        ));
      } else {
        results = await query;
      }

      res.json(results);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch parcels' });
    }
  });

  // Dedicated Parcel Instant Search Endpoint
  app.get('/api/parcels/search', requireAuth, async (req: AuthRequest, res) => {
    try {
      const q = req.query.q as string;
      if (!q) return res.json([]);

      const userBranch = req.user?.branchId;
      const isSuperAdmin = req.user?.role === 'Super Admin';

      let query = db.select({
        id: parcels.id,
        trackingNumber: parcels.trackingNumber,
        senderName: parcels.senderName,
        senderPhone: parcels.senderPhone,
        receiverName: parcels.receiverName,
        receiverPhone: parcels.receiverPhone,
        itemDescription: parcels.itemDescription,
        weight: parcels.weight,
        price: parcels.price,
        sendingBranchId: parcels.sendingBranchId,
        destinationBranchId: parcels.destinationBranchId,
        busId: parcels.busId,
        status: parcels.status,
        createdAt: parcels.createdAt,
        notes: parcels.notes,
        archived: parcels.archived,
        sendingBranchName: sql<string>`s_br.name`,
        destinationBranchName: sql<string>`d_br.name`,
        busNumber: sql<string | null>`sch.bus_number`,
      })
      .from(parcels)
      .innerJoin(sql`branches s_br`, sql`parcels.sending_branch_id = s_br.id`)
      .innerJoin(sql`branches d_br`, sql`parcels.destination_branch_id = d_br.id`)
      .leftJoin(sql`schedules sch`, sql`parcels.bus_id = sch.id`);

      const searchQuery = or(
        like(parcels.trackingNumber, `%${q}%`),
        like(parcels.senderPhone, `%${q}%`),
        like(parcels.receiverPhone, `%${q}%`),
        like(parcels.senderName, `%${q}%`),
        like(parcels.receiverName, `%${q}%`)
      );

      let results;
      if (!isSuperAdmin && userBranch) {
        results = await query.where(and(
          searchQuery,
          or(eq(parcels.sendingBranchId, userBranch), eq(parcels.destinationBranchId, userBranch))
        ));
      } else {
        results = await query.where(searchQuery);
      }

      res.json(results);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  app.post('/api/parcels', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const { senderName, senderPhone, receiverName, receiverPhone, itemDescription, weight, price, destinationBranchId, busId, notes } = req.body;

      const sendingBranchId = req.user.branchId;
      if (!sendingBranchId) {
        return res.status(400).json({ error: 'Your account is not assigned to a branch. Cannot register parcels.' });
      }

      const trackingNum = await generateTrackingNumber(sendingBranchId, parseInt(destinationBranchId));

      const newParcel = await db.insert(parcels)
        .values({
          trackingNumber: trackingNum,
          senderName,
          senderPhone,
          receiverName,
          receiverPhone,
          itemDescription,
          weight: parseInt(weight),
          price: parseInt(price),
          sendingBranchId,
          destinationBranchId: parseInt(destinationBranchId),
          busId: busId ? parseInt(busId) : null,
          createdById: req.user.id,
          status: 'Registered',
          notes,
        })
        .returning();

      // Automatically log the revenue for the sending branch
      await db.insert(finance).values({
        amount: parseInt(price),
        description: `Parcel Delivery Ticket Fee - Trk: ${trackingNum}`,
        branchId: sendingBranchId,
        category: 'Parcel Delivery',
        collectedById: req.user.id,
        paymentMethod: 'Cash',
        referenceNumber: trackingNum,
        date: new Date(),
      });

      await logActivity(
        req.user.id,
        req.user.email,
        'Register Parcel',
        `Registered parcel with tracking: ${trackingNum} -> Fee: ${price}`,
        req.user.branchId,
        req.ip
      );

      res.json(newParcel[0]);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to register parcel' });
    }
  });

  app.put('/api/parcels/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const parcelId = parseInt(req.params.id);
      const { status, archived, busId, notes, senderName, senderPhone, receiverName, receiverPhone, itemDescription, weight, price, destinationBranchId } = req.body;

      const pc = await db.select().from(parcels).where(eq(parcels.id, parcelId)).limit(1);
      if (pc.length === 0) {
        return res.status(404).json({ error: 'Parcel not found' });
      }

      const isSuperAdmin = req.user.role === 'Super Admin';
      const userBranch = req.user.branchId;

      if (!isSuperAdmin && userBranch && pc[0].sendingBranchId !== userBranch && pc[0].destinationBranchId !== userBranch) {
        return res.status(403).json({ error: 'Forbidden: You cannot modify parcels outside your branch.' });
      }

      const updateData: any = {};
      if (status !== undefined) {
        updateData.status = status;
        if (status === 'Received' || status === 'Collected') {
          updateData.receivedAt = new Date();
          updateData.receivedById = req.user.id;
        }
      }
      if (archived !== undefined) updateData.archived = archived;
      if (busId !== undefined) updateData.busId = busId ? parseInt(busId) : null;
      if (notes !== undefined) updateData.notes = notes;
      
      if (senderName !== undefined) updateData.senderName = senderName;
      if (senderPhone !== undefined) updateData.senderPhone = senderPhone;
      if (receiverName !== undefined) updateData.receiverName = receiverName;
      if (receiverPhone !== undefined) updateData.receiverPhone = receiverPhone;
      if (itemDescription !== undefined) updateData.itemDescription = itemDescription;
      if (weight !== undefined) updateData.weight = weight;
      if (price !== undefined) updateData.price = price;
      if (destinationBranchId !== undefined) updateData.destinationBranchId = destinationBranchId;

      const updated = await db.update(parcels)
        .set(updateData)
        .where(eq(parcels.id, parcelId))
        .returning();

      await logActivity(
        req.user.id,
        req.user.email,
        status === 'Collected' || status === 'Received' ? 'Mark Parcel Collected' : 'Update Parcel',
        `Updated parcel ${pc[0].trackingNumber}`,
        req.user.branchId,
        req.ip
      );

      res.json(updated[0]);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update parcel' });
    }
  });

  app.delete('/api/parcels/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const parcelId = parseInt(req.params.id);

      const pc = await db.select().from(parcels).where(eq(parcels.id, parcelId)).limit(1);
      if (pc.length === 0) {
        return res.status(404).json({ error: 'Parcel not found' });
      }

      const isSuperAdmin = req.user.role === 'Super Admin';
      const userBranch = req.user.branchId;

      if (!isSuperAdmin && userBranch && pc[0].sendingBranchId !== userBranch) {
        return res.status(403).json({ error: 'Forbidden: You can only delete parcels registered at your branch.' });
      }

      await db.delete(parcels).where(eq(parcels.id, parcelId));

      await logActivity(
        req.user.id,
        req.user.email,
        'Delete Parcel',
        `Deleted parcel ${pc[0].trackingNumber}`,
        req.user.branchId,
        req.ip
      );

      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete parcel' });
    }
  });

  // ==========================================
  // FINANCE MODULE API
  // ==========================================
  app.get('/api/finance', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userBranch = req.user?.branchId;
      const isSuperAdmin = req.user?.role === 'Super Admin';

      // Load all transactions
      let query = db.select({
        id: finance.id,
        amount: finance.amount,
        description: finance.description,
        branchId: finance.branchId,
        category: finance.category,
        date: finance.date,
        collectedById: finance.collectedById,
        paymentMethod: finance.paymentMethod,
        referenceNumber: finance.referenceNumber,
        notes: finance.notes,
        branchName: branches.name,
        collectedByName: users.name,
      })
      .from(finance)
      .innerJoin(branches, eq(finance.branchId, branches.id))
      .innerJoin(users, eq(finance.collectedById, users.id))
      .orderBy(desc(finance.date));

      let txs;
      if (!isSuperAdmin && userBranch) {
        txs = await query.where(eq(finance.branchId, userBranch));
      } else {
        txs = await query;
      }

      // Calculations for analytics
      let totalRevenue = 0;
      let todayRevenue = 0;
      let monthlyRevenue = 0;
      let weeklyRevenue = 0;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfHashMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const branchBreakdown: Record<string, number> = {};
      const categoryBreakdown: Record<string, number> = {
        'Passenger Tickets': 0,
        'Parcel Delivery': 0,
        'Cargo': 0,
        'Other': 0,
      };

      for (const tx of txs) {
        totalRevenue += tx.amount;
        const txDate = new Date(tx.date);

        if (txDate >= startOfToday) todayRevenue += tx.amount;
        if (txDate >= startOfWeek) weeklyRevenue += tx.amount;
        if (txDate >= startOfHashMonth) monthlyRevenue += tx.amount;

        branchBreakdown[tx.branchName] = (branchBreakdown[tx.branchName] || 0) + tx.amount;
        if (categoryBreakdown[tx.category] !== undefined) {
          categoryBreakdown[tx.category] += tx.amount;
        } else {
          categoryBreakdown[tx.category] = tx.amount;
        }
      }

      res.json({
        transactions: txs,
        summary: {
          totalRevenue,
          todayRevenue,
          weeklyRevenue,
          monthlyRevenue,
          branchBreakdown,
          categoryBreakdown,
        }
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch financial data' });
    }
  });

  app.post('/api/finance', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const { amount, description, category, paymentMethod, referenceNumber, notes, branchId } = req.body;

      const targetBranchId = req.user.role === 'Super Admin' && branchId ? parseInt(branchId) : req.user.branchId;
      if (!targetBranchId) {
        return res.status(400).json({ error: 'No branch is assigned to your user context.' });
      }

      const tx = await db.insert(finance)
        .values({
          amount: parseInt(amount),
          description,
          branchId: targetBranchId,
          category,
          paymentMethod,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          collectedById: req.user.id,
          date: new Date(),
        })
        .returning();

      await logActivity(
        req.user.id,
        req.user.email,
        'Record Income',
        `Recorded ${category} revenue: $${parseInt(amount) / 100}`,
        req.user.branchId,
        req.ip
      );

      res.json(tx[0]);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to record financial income' });
    }
  });

  // ==========================================
  // NOTIFICATIONS API
  // ==========================================
  app.get('/api/notifications', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const feed = await db.select()
        .from(notifications)
        .where(eq(notifications.userId, req.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(30);

      res.json(feed);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.post('/api/notifications/read-all', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      await db.update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, req.user.id));

      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update notifications' });
    }
  });

  // ==========================================
  // SYSTEM ACTIVITY LOGS API
  // ==========================================
  app.get('/api/logs', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'Super Admin' && req.user?.role !== 'Admin') {
        return res.status(403).json({ error: 'Forbidden: Admin clearance required' });
      }

      let query = db.select({
        id: activityLogs.id,
        email: activityLogs.email,
        action: activityLogs.action,
        details: activityLogs.details,
        ip: activityLogs.ip,
        createdAt: activityLogs.createdAt,
        branchName: branches.name,
      })
      .from(activityLogs)
      .leftJoin(branches, eq(activityLogs.branchId, branches.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(200);

      let logs;
      if (req.user.role !== 'Super Admin' && req.user.branchId) {
        logs = await query.where(eq(activityLogs.branchId, req.user.branchId));
      } else {
        logs = await query;
      }

      res.json(logs);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
  });

  // ==========================================
  // VITE DEV SERVER OR STATIC FILE SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start listener
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is booted and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
