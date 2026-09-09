import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, uniqueIndex, check, foreignKey, type SQLiteTableExtraConfigValue } from "drizzle-orm/sqlite-core";
export const platform_admins = sqliteTable("platform_admins", {
 id: text("id").primaryKey(),
 user_id: text("user_id").notNull(),
 email: text("email").notNull(),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_platform_admins_user_id").on(t.user_id),
]);
export const users = sqliteTable("users", {
 id: text("id").primaryKey(),
 email: text("email").notNull(),
 name: text("name").notNull(),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_users_email").on(t.email),
]);
export const tenants = sqliteTable("tenants", {
 id: text("id").primaryKey(),
 name: text("name").notNull(),
 owner_id: text("owner_id").notNull(),
 plan: text("plan").notNull(),
 trial_until: text("trial_until").notNull(),
 timezone: text("timezone").notNull(),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
]);
export const access = sqliteTable("access", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 email: text("email").notNull(),
 name: text("name").notNull(),
 role: text("role").notNull(),
 branch_id: text("branch_id"),
 member_id: text("member_id"),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_access_tenant_id_id").on(t.tenant_id,t.id),
 foreignKey({columns:[t.tenant_id,t.branch_id],foreignColumns:[branches.tenant_id,branches.id]}),
 foreignKey({columns:[t.tenant_id,t.member_id],foreignColumns:[members.tenant_id,members.id]}),
 index("idx_access_email").on(t.email),

 uniqueIndex("uq_access_tenant_id_email").on(t.tenant_id, t.email),
 index("idx_access_tenant").on(t.tenant_id, t.member_id),
]);
export const branches = sqliteTable("branches", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 name: text("name").notNull(),
 address: text("address"),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_branches_tenant_id_id").on(t.tenant_id,t.id),

 index("idx_branches_tenant").on(t.tenant_id),
]);
export const members = sqliteTable("members", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 branch_id: text("branch_id").notNull(),
 name: text("name").notNull(),
 email: text("email"),
 phone: text("phone").notNull(),
 birth_date: text("birth_date"),
 gender: text("gender"),
 emergency: text("emergency"),
 height: integer("height"),
 goal: text("goal"),
 level: text("level"),
 trainer_id: text("trainer_id"),
 notes: text("notes"),
 status: text("status").notNull(),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_members_tenant_id_id").on(t.tenant_id,t.id),
 foreignKey({columns:[t.tenant_id,t.branch_id],foreignColumns:[branches.tenant_id,branches.id]}),
 foreignKey({columns:[t.tenant_id,t.trainer_id],foreignColumns:[access.tenant_id,access.id]}),
 index("idx_members_tenant_trainer").on(t.tenant_id,t.trainer_id),
 index("idx_members_tenant_branch").on(t.tenant_id,t.branch_id),

 index("idx_members_tenant").on(t.tenant_id),
]);
export const plans = sqliteTable("plans", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 name: text("name").notNull(),
 duration: integer("duration").notNull(),
 price: integer("price").notNull(),
 description: text("description"),
 features: text("features"),
 status: text("status").notNull(),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_plans_tenant_id_id").on(t.tenant_id,t.id),

 index("idx_plans_tenant").on(t.tenant_id),
]);
export const memberships = sqliteTable("memberships", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 member_id: text("member_id").notNull(),
 plan_id: text("plan_id").notNull(),
 start_date: text("start_date").notNull(),
 end_date: text("end_date").notNull(),
 status: text("status").notNull(),
 price: integer("price").notNull(),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_memberships_tenant_id_id").on(t.tenant_id,t.id),
 foreignKey({columns:[t.tenant_id,t.member_id],foreignColumns:[members.tenant_id,members.id]}),
 foreignKey({columns:[t.tenant_id,t.plan_id],foreignColumns:[plans.tenant_id,plans.id]}),
 index("idx_memberships_tenant_end_date").on(t.tenant_id,t.end_date),

 index("idx_memberships_tenant").on(t.tenant_id, t.member_id),
 check("valid_dates", sql`${t.end_date} >= ${t.start_date}`),
]);
export const attendance = sqliteTable("attendance", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 member_id: text("member_id").notNull(),
 branch_id: text("branch_id").notNull(),
 day: text("day").notNull(),
 method: text("method").notNull(),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_attendance_tenant_id_id").on(t.tenant_id,t.id),
 foreignKey({columns:[t.tenant_id,t.member_id],foreignColumns:[members.tenant_id,members.id]}),
 foreignKey({columns:[t.tenant_id,t.branch_id],foreignColumns:[branches.tenant_id,branches.id]}),
 index("idx_attendance_tenant_day").on(t.tenant_id,t.day),

 uniqueIndex("uq_attendance_tenant_id_member_id_day").on(t.tenant_id, t.member_id, t.day),
 index("idx_attendance_tenant").on(t.tenant_id, t.member_id),
]);
export const exercises = sqliteTable("exercises", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 name: text("name").notNull(),
 muscle: text("muscle"),
 equipment: text("equipment"),
 video: text("video"),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_exercises_tenant_id_id").on(t.tenant_id,t.id),

 index("idx_exercises_tenant").on(t.tenant_id),
]);
export const programs = sqliteTable("programs", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 member_id: text("member_id"),
 trainer_id: text("trainer_id").notNull(),
 kind: text("kind").notNull(),
 name: text("name").notNull(),
 content: text("content").notNull(),
 end_date: text("end_date"),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_programs_tenant_id_id").on(t.tenant_id,t.id),
 foreignKey({columns:[t.tenant_id,t.member_id],foreignColumns:[members.tenant_id,members.id]}),
 foreignKey({columns:[t.tenant_id,t.trainer_id],foreignColumns:[access.tenant_id,access.id]}),

 index("idx_programs_tenant").on(t.tenant_id, t.member_id),
]);
export const workout_sessions = sqliteTable("workout_sessions", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 member_id: text("member_id").notNull(),
 program_id: text("program_id").notNull(),
 day: text("day").notNull(),
 notes: text("notes"),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_workout_sessions_tenant_id_id").on(t.tenant_id,t.id),
 foreignKey({columns:[t.tenant_id,t.member_id],foreignColumns:[members.tenant_id,members.id]}),
 foreignKey({columns:[t.tenant_id,t.program_id],foreignColumns:[programs.tenant_id,programs.id]}),

 index("idx_workout_sessions_tenant").on(t.tenant_id, t.member_id),
]);
export const measurements = sqliteTable("measurements", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 member_id: text("member_id").notNull(),
 date: text("date").notNull(),
 weight: real("weight").notNull(),
 fat: real("fat"),
 chest: real("chest"),
 waist: real("waist"),
 arms: real("arms"),
 legs: real("legs"),
 shoulders: real("shoulders"),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_measurements_tenant_id_id").on(t.tenant_id,t.id),
 foreignKey({columns:[t.tenant_id,t.member_id],foreignColumns:[members.tenant_id,members.id]}),
 index("idx_measurements_tenant_date").on(t.tenant_id,t.date),

 index("idx_measurements_tenant").on(t.tenant_id, t.member_id),
]);
export const photos = sqliteTable("photos", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 member_id: text("member_id").notNull(),
 object_key: text("object_key").notNull(),
 mime: text("mime").notNull(),
 caption: text("caption"),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_photos_tenant_id_id").on(t.tenant_id,t.id),
 foreignKey({columns:[t.tenant_id,t.member_id],foreignColumns:[members.tenant_id,members.id]}),

 index("idx_photos_tenant").on(t.tenant_id, t.member_id),
]);
export const products = sqliteTable("products", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 name: text("name").notNull(),
 sku: text("sku").notNull(),
 category: text("category").notNull(),
 brand: text("brand"),
 description: text("description"),
 price: integer("price").notNull(),
 stock: integer("stock").notNull(),
 threshold: integer("threshold").notNull(),
 status: text("status").notNull(),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_products_tenant_id_id").on(t.tenant_id,t.id),

 uniqueIndex("uq_products_tenant_id_sku").on(t.tenant_id, t.sku),
 index("idx_products_tenant").on(t.tenant_id),
 check("stock_nonnegative", sql`${t.stock} >= 0`), check("price_nonnegative", sql`${t.price} >= 0`),
]);
export const orders = sqliteTable("orders", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 member_id: text("member_id").notNull(),
 branch_id: text("branch_id").notNull(),
 total: integer("total").notNull(),
 status: text("status").notNull(),
 idempotency: text("idempotency").notNull(),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_orders_tenant_id_id").on(t.tenant_id,t.id),
 foreignKey({columns:[t.tenant_id,t.member_id],foreignColumns:[members.tenant_id,members.id]}),
 foreignKey({columns:[t.tenant_id,t.branch_id],foreignColumns:[branches.tenant_id,branches.id]}),

 uniqueIndex("uq_orders_tenant_id_idempotency").on(t.tenant_id, t.idempotency),
 index("idx_orders_tenant").on(t.tenant_id, t.member_id),
]);
export const order_items = sqliteTable("order_items", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 order_id: text("order_id").notNull(),
 product_id: text("product_id").notNull(),
 name: text("name").notNull(),
 quantity: integer("quantity").notNull(),
 price: integer("price").notNull(),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_order_items_tenant_id_id").on(t.tenant_id,t.id),
 foreignKey({columns:[t.tenant_id,t.order_id],foreignColumns:[orders.tenant_id,orders.id]}),
 foreignKey({columns:[t.tenant_id,t.product_id],foreignColumns:[products.tenant_id,products.id]}),

 index("idx_order_items_tenant").on(t.tenant_id),
 check("quantity_positive", sql`${t.quantity} > 0`),
]);
export const payments = sqliteTable("payments", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 member_id: text("member_id").notNull(),
 order_id: text("order_id"),
 membership_id: text("membership_id"),
 amount: integer("amount").notNull(),
 kind: text("kind").notNull(),
 reference: text("reference").notNull(),
 status: text("status").notNull(),
 date: text("date").notNull(),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_payments_tenant_id_id").on(t.tenant_id,t.id),
 foreignKey({columns:[t.tenant_id,t.member_id],foreignColumns:[members.tenant_id,members.id]}),
 foreignKey({columns:[t.tenant_id,t.order_id],foreignColumns:[orders.tenant_id,orders.id]}),
 foreignKey({columns:[t.tenant_id,t.membership_id],foreignColumns:[memberships.tenant_id,memberships.id]}),
 index("idx_payments_tenant_date").on(t.tenant_id,t.date),

 uniqueIndex("uq_payments_tenant_id_reference").on(t.tenant_id, t.reference),
 index("idx_payments_tenant").on(t.tenant_id, t.member_id),
 check("amount_positive", sql`${t.amount} > 0`),
]);
export const notifications = sqliteTable("notifications", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 member_id: text("member_id"),
 recipient_email: text("recipient_email"),
 title: text("title").notNull(),
 body: text("body").notNull(),
 read_at: text("read_at"),
 dedupe: text("dedupe"),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_notifications_tenant_id_id").on(t.tenant_id,t.id),
 foreignKey({columns:[t.tenant_id,t.member_id],foreignColumns:[members.tenant_id,members.id]}),

 uniqueIndex("uq_notifications_tenant_id_dedupe").on(t.tenant_id, t.dedupe),
 index("idx_notifications_tenant").on(t.tenant_id, t.member_id),
]);
export const automations = sqliteTable("automations", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 name: text("name").notNull(),
 kind: text("kind").notNull(),
 enabled: integer("enabled").notNull(),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_automations_tenant_id_id").on(t.tenant_id,t.id),

 index("idx_automations_tenant").on(t.tenant_id),
]);
export const crm_tasks = sqliteTable("crm_tasks", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 member_id: text("member_id").notNull(),
 title: text("title").notNull(),
 status: text("status").notNull(),
 dedupe: text("dedupe").notNull(),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_crm_tasks_tenant_id_id").on(t.tenant_id,t.id),
 foreignKey({columns:[t.tenant_id,t.member_id],foreignColumns:[members.tenant_id,members.id]}),

 uniqueIndex("uq_crm_tasks_tenant_id_dedupe").on(t.tenant_id, t.dedupe),
 index("idx_crm_tasks_tenant").on(t.tenant_id, t.member_id),
]);
export const audit_logs = sqliteTable("audit_logs", {
 id: text("id").primaryKey(),
 tenant_id: text("tenant_id").notNull().references(() => tenants.id),
 actor: text("actor").notNull(),
 action: text("action").notNull(),
 entity_id: text("entity_id").notNull(),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_audit_logs_tenant_id_id").on(t.tenant_id,t.id),

 index("idx_audit_logs_tenant").on(t.tenant_id),
]);
export const rate_limits = sqliteTable("rate_limits", {
 id: text("id").primaryKey(),
 user_id: text("user_id").notNull(),
 bucket: integer("bucket").notNull(),
 count: integer("count").notNull(),
 created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
 updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t): SQLiteTableExtraConfigValue[] => [
 uniqueIndex("uq_rate_limits_user_id_bucket").on(t.user_id, t.bucket),
]);
export const qr_tokens = sqliteTable('qr_tokens', {
 id:text('id').primaryKey(),tenant_id:text('tenant_id').notNull().references(()=>tenants.id),
 member_id:text('member_id').notNull(),token_hash:text('token_hash').notNull(),expires_at:integer('expires_at').notNull(),used_at:text('used_at'),
 created_at:text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
},t=>[uniqueIndex('uq_qr_token_hash').on(t.token_hash),index('idx_qr_tenant_member').on(t.tenant_id,t.member_id),foreignKey({columns:[t.tenant_id,t.member_id],foreignColumns:[members.tenant_id,members.id]})]);
