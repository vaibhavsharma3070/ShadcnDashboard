import { pgTable, text, uuid, numeric, date, timestamp, index, foreignKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const vendor = pgTable("vendor", {
  vendorId: uuid("vendor_id").primaryKey().defaultRandom(),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  taxId: text("tax_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("idx_vendor_email").on(table.email),
}));

export const client = pgTable("client", {
  clientId: uuid("client_id").primaryKey().defaultRandom(),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  billingAddr: text("billing_addr"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("idx_client_email").on(table.email),
}));

export const item = pgTable("item", {
  itemId: uuid("item_id").primaryKey().defaultRandom(),
  vendorId: uuid("vendor_id").notNull(),
  title: text("title"),
  brand: text("brand"),
  model: text("model"),
  serialNo: text("serial_no"),
  condition: text("condition"),
  acquisitionDate: date("acquisition_date"),
  agreedVendorPayout: numeric("agreed_vendor_payout", { precision: 12, scale: 2 }),
  listPrice: numeric("list_price", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("in-store"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  vendorIdx: index("idx_item_vendor").on(table.vendorId),
  statusIdx: index("idx_item_status").on(table.status),
  serialNoIdx: index("idx_item_serial").on(table.serialNo),
  vendorFk: foreignKey({
    columns: [table.vendorId],
    foreignColumns: [vendor.vendorId]
  }),
}));

export const clientPayment = pgTable("client_payment", {
  paymentId: uuid("payment_id").primaryKey().defaultRandom(),
  itemId: uuid("item_id").notNull(),
  clientId: uuid("client_id").notNull(),
  paymentMethod: text("payment_method").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
}, (table) => ({
  itemIdx: index("idx_cp_item").on(table.itemId),
  clientIdx: index("idx_cp_client").on(table.clientId),
  itemFk: foreignKey({
    columns: [table.itemId],
    foreignColumns: [item.itemId]
  }),
  clientFk: foreignKey({
    columns: [table.clientId],
    foreignColumns: [client.clientId]
  }),
}));

export const vendorPayout = pgTable("vendor_payout", {
  payoutId: uuid("payout_id").primaryKey().defaultRandom(),
  itemId: uuid("item_id").notNull(),
  vendorId: uuid("vendor_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
  bankAccount: text("bank_account"),
  transferId: text("transfer_id"),
  notes: text("notes"),
}, (table) => ({
  itemIdx: index("idx_vp_item").on(table.itemId),
  vendorIdx: index("idx_vp_vendor").on(table.vendorId),
  paidAtIdx: index("idx_vp_paidat").on(table.paidAt),
  itemFk: foreignKey({
    columns: [table.itemId],
    foreignColumns: [item.itemId]
  }),
  vendorFk: foreignKey({
    columns: [table.vendorId],
    foreignColumns: [vendor.vendorId]
  }),
}));

export const itemExpense = pgTable("item_expense", {
  expenseId: uuid("expense_id").primaryKey().defaultRandom(),
  itemId: uuid("item_id").notNull(),
  expenseType: text("expense_type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  incurredAt: timestamp("incurred_at", { withTimezone: true }).notNull(),
  notes: text("notes"),
}, (table) => ({
  itemIdx: index("idx_ie_item").on(table.itemId),
  itemFk: foreignKey({
    columns: [table.itemId],
    foreignColumns: [item.itemId]
  }),
}));

export const installmentPlan = pgTable("installment_plan", {
  installmentId: uuid("installment_id").primaryKey().defaultRandom(),
  itemId: uuid("item_id").notNull(),
  clientId: uuid("client_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("pending"), // pending, paid, overdue
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  itemIdx: index("idx_ip_item").on(table.itemId),
  clientIdx: index("idx_ip_client").on(table.clientId),
  dueDateIdx: index("idx_ip_due_date").on(table.dueDate),
  statusIdx: index("idx_ip_status").on(table.status),
  itemFk: foreignKey({
    columns: [table.itemId],
    foreignColumns: [item.itemId]
  }),
  clientFk: foreignKey({
    columns: [table.clientId],
    foreignColumns: [client.clientId]
  }),
}));

// Relations
export const vendorRelations = relations(vendor, ({ many }) => ({
  items: many(item),
  payouts: many(vendorPayout),
}));

export const clientRelations = relations(client, ({ many }) => ({
  payments: many(clientPayment),
  installmentPlans: many(installmentPlan),
}));

export const itemRelations = relations(item, ({ one, many }) => ({
  vendor: one(vendor, {
    fields: [item.vendorId],
    references: [vendor.vendorId]
  }),
  payments: many(clientPayment),
  expenses: many(itemExpense),
  installmentPlans: many(installmentPlan),
  payout: one(vendorPayout, {
    fields: [item.itemId],
    references: [vendorPayout.itemId]
  }),
}));

export const clientPaymentRelations = relations(clientPayment, ({ one }) => ({
  item: one(item, {
    fields: [clientPayment.itemId],
    references: [item.itemId]
  }),
  client: one(client, {
    fields: [clientPayment.clientId],
    references: [client.clientId]
  }),
}));

export const vendorPayoutRelations = relations(vendorPayout, ({ one }) => ({
  item: one(item, {
    fields: [vendorPayout.itemId],
    references: [item.itemId]
  }),
  vendor: one(vendor, {
    fields: [vendorPayout.vendorId],
    references: [vendor.vendorId]
  }),
}));

export const itemExpenseRelations = relations(itemExpense, ({ one }) => ({
  item: one(item, {
    fields: [itemExpense.itemId],
    references: [item.itemId]
  }),
}));

export const installmentPlanRelations = relations(installmentPlan, ({ one }) => ({
  item: one(item, {
    fields: [installmentPlan.itemId],
    references: [item.itemId]
  }),
  client: one(client, {
    fields: [installmentPlan.clientId],
    references: [client.clientId]
  }),
}));

// Insert schemas
export const insertVendorSchema = createInsertSchema(vendor).omit({
  vendorId: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(client).omit({
  clientId: true,
  createdAt: true,
});

export const insertItemSchema = createInsertSchema(item).omit({
  itemId: true,
  createdAt: true,
}).extend({
  agreedVendorPayout: z.preprocess((val) => 
    val === null || val === undefined || val === '' ? null : (typeof val === 'string' ? parseFloat(val) : val),
    z.number().nullable()
  ).optional(),
  listPrice: z.preprocess((val) => 
    val === null || val === undefined || val === '' ? null : (typeof val === 'string' ? parseFloat(val) : val),
    z.number().nullable()
  ).optional(),
  acquisitionDate: z.preprocess((val) => 
    val === null || val === undefined || val === '' ? null : (typeof val === 'string' ? new Date(val) : val),
    z.date().nullable()
  ).optional(),
});

export const insertClientPaymentSchema = createInsertSchema(clientPayment).omit({
  paymentId: true,
}).extend({
  amount: z.preprocess((val) => typeof val === 'string' ? parseFloat(val) : val, z.number()),
  paidAt: z.preprocess((val) => typeof val === 'string' ? new Date(val) : val, z.date()),
});

export const insertVendorPayoutSchema = createInsertSchema(vendorPayout).omit({
  payoutId: true,
}).extend({
  amount: z.preprocess((val) => typeof val === 'string' ? parseFloat(val) : val, z.number()),
  paidAt: z.preprocess((val) => typeof val === 'string' ? new Date(val) : val, z.date()),
});

export const insertItemExpenseSchema = createInsertSchema(itemExpense).omit({
  expenseId: true,
}).extend({
  amount: z.preprocess((val) => typeof val === 'string' ? parseFloat(val) : val, z.number()),
  incurredAt: z.preprocess((val) => typeof val === 'string' ? new Date(val) : val, z.date()),
});

export const insertInstallmentPlanSchema = createInsertSchema(installmentPlan).omit({
  installmentId: true,
  paidAmount: true,
  status: true,
  createdAt: true,
}).extend({
  amount: z.preprocess((val) => typeof val === 'string' ? parseFloat(val) : val, z.number()),
  dueDate: z.preprocess((val) => typeof val === 'string' ? new Date(val) : val, z.date()),
});

// Types
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendor.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof client.$inferSelect;

export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof item.$inferSelect;

export type InsertClientPayment = z.infer<typeof insertClientPaymentSchema>;
export type ClientPayment = typeof clientPayment.$inferSelect;

export type InsertVendorPayout = z.infer<typeof insertVendorPayoutSchema>;
export type VendorPayout = typeof vendorPayout.$inferSelect;

export type InsertItemExpense = z.infer<typeof insertItemExpenseSchema>;
export type ItemExpense = typeof itemExpense.$inferSelect;

export type InsertInstallmentPlan = z.infer<typeof insertInstallmentPlanSchema>;
export type InstallmentPlan = typeof installmentPlan.$inferSelect;

// Legacy user table (keeping for compatibility)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
