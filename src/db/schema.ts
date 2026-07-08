import { pgTable, serial, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Branches table
export const branches = pgTable('branches', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(), // e.g., HGA, BRM, BUO, BER, GAB, LA
  location: text('location').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Users table (UID is Firebase UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('Staff'), // 'Super Admin', 'Admin', 'Branch Manager', 'Staff'
  branchId: integer('branch_id').references(() => branches.id),
  status: text('status').notNull().default('active'), // 'active', 'inactive'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Departure/Schedules table
export const schedules = pgTable('schedules', {
  id: serial('id').primaryKey(),
  busNumber: text('bus_number').notNull(),
  driver: text('driver').notNull(),
  departureBranchId: integer('departure_branch_id').references(() => branches.id).notNull(),
  arrivalBranchId: integer('arrival_branch_id').references(() => branches.id).notNull(),
  departureTime: timestamp('departure_time').notNull(),
  estimatedArrival: timestamp('estimated_arrival').notNull(),
  status: text('status').notNull().default('Scheduled'), // 'Scheduled', 'Departed', 'Arrived', 'Cancelled'
  availableSeats: integer('available_seats').notNull(),
  totalSeats: integer('total_seats').notNull(),
  price: integer('price').notNull(), // Seat ticket price in cents/units
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Parcels table
export const parcels = pgTable('parcels', {
  id: serial('id').primaryKey(),
  trackingNumber: text('tracking_number').notNull().unique(),
  senderName: text('sender_name').notNull(),
  senderPhone: text('sender_phone').notNull(),
  receiverName: text('receiver_name').notNull(),
  receiverPhone: text('receiver_phone').notNull(),
  itemDescription: text('item_description').notNull(),
  weight: integer('weight').notNull(), // in grams or kg
  price: integer('price').notNull(), // parcel delivery fee
  sendingBranchId: integer('sending_branch_id').references(() => branches.id).notNull(),
  destinationBranchId: integer('destination_branch_id').references(() => branches.id).notNull(),
  busId: integer('bus_id').references(() => schedules.id),
  status: text('status').notNull().default('Registered'), // 'Registered', 'On The Way', 'Arrived', 'Received', 'Cancelled', 'Archived'
  departureTime: timestamp('departure_time'),
  estimatedArrivalTime: timestamp('estimated_arrival_time'),
  createdById: integer('created_by_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  receivedAt: timestamp('received_at'),
  receivedById: integer('received_by_id').references(() => users.id),
  notes: text('notes'),
  archived: boolean('archived').notNull().default(false),
});

// Finance table
export const finance = pgTable('finance', {
  id: serial('id').primaryKey(),
  amount: integer('amount').notNull(), // Amount in cents/units
  description: text('description').notNull(),
  branchId: integer('branch_id').references(() => branches.id).notNull(),
  category: text('category').notNull(), // 'Passenger Tickets', 'Parcel Delivery', 'Cargo', 'Other'
  date: timestamp('date').defaultNow().notNull(),
  collectedById: integer('collected_by_id').references(() => users.id).notNull(),
  paymentMethod: text('payment_method').notNull(), // 'Cash', 'Zaad', 'e-Dahab', 'Card'
  referenceNumber: text('reference_number'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(), // 'parcel', 'schedule', 'finance', 'system'
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Activity Logs table
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  email: text('email'),
  action: text('action').notNull(),
  details: text('details').notNull(),
  ip: text('ip'),
  branchId: integer('branch_id').references(() => branches.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Settings table
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  companyName: text('company_name').notNull().default('SafarLink'),
  companyLogo: text('company_logo'),
  theme: text('theme').notNull().default('light'),
  travelTimeHours: integer('travel_time_hours').notNull().default(3),
  notificationPreferences: text('notification_preferences').notNull().default('{"email":true,"push":true}'),
  currency: text('currency').notNull().default('USD'),
  language: text('language').notNull().default('en'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations definitions
export const usersRelations = relations(users, ({ one, many }) => ({
  branch: one(branches, {
    fields: [users.branchId],
    references: [branches.id],
  }),
  createdParcels: many(parcels, { relationName: 'createdParcels' }),
  receivedParcels: many(parcels, { relationName: 'receivedParcels' }),
  finances: many(finance),
  notifications: many(notifications),
  activityLogs: many(activityLogs),
}));

export const branchesRelations = relations(branches, ({ many }) => ({
  users: many(users),
  departureSchedules: many(schedules, { relationName: 'departureSchedules' }),
  arrivalSchedules: many(schedules, { relationName: 'arrivalSchedules' }),
  sendingParcels: many(parcels, { relationName: 'sendingParcels' }),
  destinationParcels: many(parcels, { relationName: 'destinationParcels' }),
  finances: many(finance),
  activityLogs: many(activityLogs),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  departureBranch: one(branches, {
    fields: [schedules.departureBranchId],
    references: [branches.id],
    relationName: 'departureSchedules',
  }),
  arrivalBranch: one(branches, {
    fields: [schedules.arrivalBranchId],
    references: [branches.id],
    relationName: 'arrivalSchedules',
  }),
  parcels: many(parcels),
}));

export const parcelsRelations = relations(parcels, ({ one }) => ({
  sendingBranch: one(branches, {
    fields: [parcels.sendingBranchId],
    references: [branches.id],
    relationName: 'sendingParcels',
  }),
  destinationBranch: one(branches, {
    fields: [parcels.destinationBranchId],
    references: [branches.id],
    relationName: 'destinationParcels',
  }),
  bus: one(schedules, {
    fields: [parcels.busId],
    references: [schedules.id],
  }),
  createdBy: one(users, {
    fields: [parcels.createdById],
    references: [users.id],
    relationName: 'createdParcels',
  }),
  receivedBy: one(users, {
    fields: [parcels.receivedById],
    references: [users.id],
    relationName: 'receivedParcels',
  }),
}));

export const financeRelations = relations(finance, ({ one }) => ({
  branch: one(branches, {
    fields: [finance.branchId],
    references: [branches.id],
  }),
  collectedBy: one(users, {
    fields: [finance.collectedById],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
  branch: one(branches, {
    fields: [activityLogs.branchId],
    references: [branches.id],
  }),
}));
