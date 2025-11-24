import { pgTable, text, uuid, numeric, date, timestamp, index, foreignKey, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const vendor = pgTable("vendor", {
  vendorId: uuid("vendor_id").primaryKey().defaultRandom(),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  taxId: text("tax_id"),
  bankAccountNumber: text("bank_account_number"),
  bankName: text("bank_name"),
  accountType: text("account_type"),
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
  idNumber: text("id_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("idx_client_email").on(table.email),
}));

export const brand = pgTable("brand", {
  brandId: uuid("brand_id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  active: text("active").notNull().default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("idx_brand_name").on(table.name),
  activeIdx: index("idx_brand_active").on(table.active),
}));

export const category = pgTable("category", {
  categoryId: uuid("category_id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  active: text("active").notNull().default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("idx_category_name").on(table.name),
  activeIdx: index("idx_category_active").on(table.active),
}));

export const paymentMethod = pgTable("payment_method", {
  paymentMethodId: uuid("payment_method_id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  active: text("active").notNull().default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("idx_payment_method_name").on(table.name),
  activeIdx: index("idx_payment_method_active").on(table.active),
}));

export const item = pgTable("item", {
  itemId: uuid("item_id").primaryKey().defaultRandom(),
  vendorId: uuid("vendor_id").notNull(),
  brandId: uuid("brand_id"),
  categoryId: uuid("category_id"),
  title: text("title"),
  brand: text("brand"), // Legacy field for migration
  model: text("model"),
  serialNo: text("serial_no"),
  condition: text("condition"),
  acquisitionDate: date("acquisition_date"),
  minCost: numeric("min_cost", { precision: 12, scale: 2 }),
  maxCost: numeric("max_cost", { precision: 12, scale: 2 }),
  minSalesPrice: numeric("min_sales_price", { precision: 12, scale: 2 }),
  maxSalesPrice: numeric("max_sales_price", { precision: 12, scale: 2 }),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("in-store"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  vendorIdx: index("idx_item_vendor").on(table.vendorId),
  brandIdx: index("idx_item_brand").on(table.brandId),
  categoryIdx: index("idx_item_category").on(table.categoryId),
  statusIdx: index("idx_item_status").on(table.status),
  serialNoIdx: index("idx_item_serial").on(table.serialNo),
  vendorFk: foreignKey({
    columns: [table.vendorId],
    foreignColumns: [vendor.vendorId]
  }),
  brandFk: foreignKey({
    columns: [table.brandId],
    foreignColumns: [brand.brandId]
  }),
  categoryFk: foreignKey({
    columns: [table.categoryId],
    foreignColumns: [category.categoryId]
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
  itemId: uuid("item_id"), // Optional - can be null for general business expenses
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

// Update the relations
export const itemExpenseRelations = relations(itemExpense, ({ one }) => ({
  item: one(item, {
    fields: [itemExpense.itemId],
    references: [item.itemId]
  }),
}));

// Update the insert schema
export const insertItemExpenseSchema = createInsertSchema(itemExpense).omit({
  expenseId: true,
}).extend({
  itemId: z.string().uuid().optional().nullable(),
  amount: z.preprocess((val) => typeof val === 'string' ? parseFloat(val) : val, z.number()),
  incurredAt: z.preprocess((val) => typeof val === 'string' ? new Date(val) : val, z.date()),
});



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

export const contractStatusEnum = pgEnum("contract_status", ["draft", "final"]);

export const contractTemplate = pgTable("contract_template", {
  templateId: uuid("template_id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  termsText: text("terms_text").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("idx_contract_template_name").on(table.name),
  defaultIdx: index("idx_contract_template_default").on(table.isDefault),
}));

export const contract = pgTable("contract", {
  contractId: uuid("contract_id").primaryKey().defaultRandom(),
  vendorId: uuid("vendor_id").notNull(),
  templateId: uuid("template_id"),
  status: contractStatusEnum("status").notNull().default("draft"),
  termsText: text("terms_text").notNull(),
  itemSnapshots: jsonb("item_snapshots").notNull(),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  vendorIdx: index("idx_contract_vendor").on(table.vendorId),
  statusIdx: index("idx_contract_status").on(table.status),
  createdAtIdx: index("idx_contract_created_at").on(table.createdAt),
  vendorFk: foreignKey({
    columns: [table.vendorId],
    foreignColumns: [vendor.vendorId]
  }),
  templateFk: foreignKey({
    columns: [table.templateId],
    foreignColumns: [contractTemplate.templateId]
  }),
}));

// Relations
export const vendorRelations = relations(vendor, ({ many }) => ({
  items: many(item),
  payouts: many(vendorPayout),
  contracts: many(contract),
}));

export const clientRelations = relations(client, ({ many }) => ({
  payments: many(clientPayment),
  installmentPlans: many(installmentPlan),
}));

export const brandRelations = relations(brand, ({ many }) => ({
  items: many(item),
}));

export const categoryRelations = relations(category, ({ many }) => ({
  items: many(item),
}));

export const itemRelations = relations(item, ({ one, many }) => ({
  vendor: one(vendor, {
    fields: [item.vendorId],
    references: [vendor.vendorId]
  }),
  brand: one(brand, {
    fields: [item.brandId],
    references: [brand.brandId]
  }),
  category: one(category, {
    fields: [item.categoryId],
    references: [category.categoryId]
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

export const contractTemplateRelations = relations(contractTemplate, ({ many }) => ({
  contracts: many(contract),
}));

export const contractRelations = relations(contract, ({ one }) => ({
  vendor: one(vendor, {
    fields: [contract.vendorId],
    references: [vendor.vendorId]
  }),
  template: one(contractTemplate, {
    fields: [contract.templateId],
    references: [contractTemplate.templateId]
  }),
}));

// Insert schemas
export const insertVendorSchema = createInsertSchema(vendor).omit({
  vendorId: true,
  createdAt: true,
}).extend({
  accountType: z.enum(["Ahorros", "Corriente"]).optional(),
});

export const insertClientSchema = createInsertSchema(client).omit({
  clientId: true,
  createdAt: true,
});

export const insertBrandSchema = createInsertSchema(brand).omit({
  brandId: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(category).omit({
  categoryId: true,
  createdAt: true,
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethod).omit({
  paymentMethodId: true,
  createdAt: true,
});

export const insertItemSchema = createInsertSchema(item).omit({
  itemId: true,
  brand: true, // Omit legacy brand field
  createdAt: true,
}).extend({
  brandId: z.string().min(1, "Brand is required"),
  categoryId: z.preprocess((val) => 
    val === null || val === undefined || val === '' || val === 'none' ? undefined : val,
    z.string().uuid().optional()
  ),
  minCost: z.preprocess((val) => 
    val === null || val === undefined || val === '' ? null : (typeof val === 'string' ? parseFloat(val) : val),
    z.number().nullable()
  ).optional(),
  maxCost: z.preprocess((val) => 
    val === null || val === undefined || val === '' ? null : (typeof val === 'string' ? parseFloat(val) : val),
    z.number().nullable()
  ).optional(),
  minSalesPrice: z.preprocess((val) => 
    val === null || val === undefined || val === '' ? null : (typeof val === 'string' ? parseFloat(val) : val),
    z.number().nullable()
  ).optional(),
  maxSalesPrice: z.preprocess((val) => 
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


export const insertInstallmentPlanSchema = createInsertSchema(installmentPlan).omit({
  installmentId: true,
  paidAmount: true,
  status: true,
  createdAt: true,
}).extend({
  amount: z.preprocess((val) => typeof val === 'string' ? parseFloat(val) : val, z.number()),
  dueDate: z.preprocess((val) => typeof val === 'string' ? new Date(val) : val, z.date()),
});

// Contract Item Snapshot schema for validation
export const contractItemSnapshotSchema = z.object({
  itemId: z.string().uuid(),
  title: z.string(),
  brand: z.string(),
  model: z.string().optional(),
  serialNo: z.string().optional(),
  condition: z.string().optional(),
  imageUrl: z.string().optional(),
  minCost: z.number().optional(),
  maxCost: z.number().optional(),
  marketValue: z.number().optional(),
});

export const insertContractTemplateSchema = createInsertSchema(contractTemplate).omit({
  templateId: true,
  createdAt: true,
}).extend({
  isDefault: z.boolean().default(false),
});

export const insertContractSchema = createInsertSchema(contract).omit({
  contractId: true,
  createdAt: true,
  pdfUrl: true,
}).extend({
  status: z.enum(["draft", "final"]).default("draft"),
  itemSnapshots: z.array(contractItemSnapshotSchema),
});

// Types
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendor.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof client.$inferSelect;

export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Brand = typeof brand.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof category.$inferSelect;

export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethod.$inferSelect;

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

export type InsertContractTemplate = z.infer<typeof insertContractTemplateSchema>;
export type ContractTemplate = typeof contractTemplate.$inferSelect;

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contract.$inferSelect;

export type ContractItemSnapshot = z.infer<typeof contractItemSnapshotSchema>;

// User role enum
export const userRoleEnum = pgEnum("user_role", ["admin", "staff", "readOnly"]);

// Users table for authentication
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("staff"),
  active: boolean("active").notNull().default(true),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
}, (table) => ({
  emailIdx: index("idx_user_email").on(table.email),
  roleIdx: index("idx_user_role").on(table.role),
  activeIdx: index("idx_user_active").on(table.active),
}));

// User schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Correo electrónico inválido"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  role: z.enum(["admin", "staff", "readOnly"]),
  active: z.boolean(),
}).pick({
  email: true,
  name: true,
  role: true,
  active: true,
});

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const createUserSchema = insertUserSchema.extend({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const updateUserSchema = insertUserSchema.partial().extend({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;
export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
