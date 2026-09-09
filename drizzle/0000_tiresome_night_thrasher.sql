CREATE TABLE `access` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`branch_id` text,
	`member_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`branch_id`) REFERENCES `branches`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`member_id`) REFERENCES `members`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_access_tenant_id_id` ON `access` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_access_email` ON `access` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_access_tenant_id_email` ON `access` (`tenant_id`,`email`);--> statement-breakpoint
CREATE INDEX `idx_access_tenant` ON `access` (`tenant_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`member_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`day` text NOT NULL,
	`method` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`member_id`) REFERENCES `members`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`branch_id`) REFERENCES `branches`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_attendance_tenant_id_id` ON `attendance` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_attendance_tenant_day` ON `attendance` (`tenant_id`,`day`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_attendance_tenant_id_member_id_day` ON `attendance` (`tenant_id`,`member_id`,`day`);--> statement-breakpoint
CREATE INDEX `idx_attendance_tenant` ON `attendance` (`tenant_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_audit_logs_tenant_id_id` ON `audit_logs` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_tenant` ON `audit_logs` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `automations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`enabled` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_automations_tenant_id_id` ON `automations` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_automations_tenant` ON `automations` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `branches` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_branches_tenant_id_id` ON `branches` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_branches_tenant` ON `branches` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `crm_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`member_id` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`dedupe` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`member_id`) REFERENCES `members`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_crm_tasks_tenant_id_id` ON `crm_tasks` (`tenant_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_crm_tasks_tenant_id_dedupe` ON `crm_tasks` (`tenant_id`,`dedupe`);--> statement-breakpoint
CREATE INDEX `idx_crm_tasks_tenant` ON `crm_tasks` (`tenant_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`muscle` text,
	`equipment` text,
	`video` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_exercises_tenant_id_id` ON `exercises` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_exercises_tenant` ON `exercises` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`member_id` text NOT NULL,
	`date` text NOT NULL,
	`weight` real NOT NULL,
	`fat` real,
	`chest` real,
	`waist` real,
	`arms` real,
	`legs` real,
	`shoulders` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`member_id`) REFERENCES `members`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_measurements_tenant_id_id` ON `measurements` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_measurements_tenant_date` ON `measurements` (`tenant_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_measurements_tenant` ON `measurements` (`tenant_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text NOT NULL,
	`birth_date` text,
	`gender` text,
	`emergency` text,
	`height` integer,
	`goal` text,
	`level` text,
	`trainer_id` text,
	`notes` text,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`branch_id`) REFERENCES `branches`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`trainer_id`) REFERENCES `access`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_members_tenant_id_id` ON `members` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_members_tenant_trainer` ON `members` (`tenant_id`,`trainer_id`);--> statement-breakpoint
CREATE INDEX `idx_members_tenant_branch` ON `members` (`tenant_id`,`branch_id`);--> statement-breakpoint
CREATE INDEX `idx_members_tenant` ON `members` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`member_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`status` text NOT NULL,
	`price` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`member_id`) REFERENCES `members`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`plan_id`) REFERENCES `plans`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "valid_dates" CHECK("memberships"."end_date" >= "memberships"."start_date")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_memberships_tenant_id_id` ON `memberships` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_memberships_tenant_end_date` ON `memberships` (`tenant_id`,`end_date`);--> statement-breakpoint
CREATE INDEX `idx_memberships_tenant` ON `memberships` (`tenant_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`member_id` text,
	`recipient_email` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`read_at` text,
	`dedupe` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`member_id`) REFERENCES `members`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_notifications_tenant_id_id` ON `notifications` (`tenant_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_notifications_tenant_id_dedupe` ON `notifications` (`tenant_id`,`dedupe`);--> statement-breakpoint
CREATE INDEX `idx_notifications_tenant` ON `notifications` (`tenant_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer NOT NULL,
	`price` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`order_id`) REFERENCES `orders`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`product_id`) REFERENCES `products`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "quantity_positive" CHECK("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_order_items_tenant_id_id` ON `order_items` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_order_items_tenant` ON `order_items` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`member_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`total` integer NOT NULL,
	`status` text NOT NULL,
	`idempotency` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`member_id`) REFERENCES `members`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`branch_id`) REFERENCES `branches`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_orders_tenant_id_id` ON `orders` (`tenant_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_orders_tenant_id_idempotency` ON `orders` (`tenant_id`,`idempotency`);--> statement-breakpoint
CREATE INDEX `idx_orders_tenant` ON `orders` (`tenant_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`member_id` text NOT NULL,
	`order_id` text,
	`membership_id` text,
	`amount` integer NOT NULL,
	`kind` text NOT NULL,
	`reference` text NOT NULL,
	`status` text NOT NULL,
	`date` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`member_id`) REFERENCES `members`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`order_id`) REFERENCES `orders`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`membership_id`) REFERENCES `memberships`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "amount_positive" CHECK("payments"."amount" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payments_tenant_id_id` ON `payments` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_payments_tenant_date` ON `payments` (`tenant_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payments_tenant_id_reference` ON `payments` (`tenant_id`,`reference`);--> statement-breakpoint
CREATE INDEX `idx_payments_tenant` ON `payments` (`tenant_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`member_id` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`caption` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`member_id`) REFERENCES `members`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_photos_tenant_id_id` ON `photos` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_photos_tenant` ON `photos` (`tenant_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`duration` integer NOT NULL,
	`price` integer NOT NULL,
	`description` text,
	`features` text,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_plans_tenant_id_id` ON `plans` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_plans_tenant` ON `plans` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `platform_admins` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_platform_admins_user_id` ON `platform_admins` (`user_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`category` text NOT NULL,
	`brand` text,
	`description` text,
	`price` integer NOT NULL,
	`stock` integer NOT NULL,
	`threshold` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stock_nonnegative" CHECK("products"."stock" >= 0),
	CONSTRAINT "price_nonnegative" CHECK("products"."price" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_products_tenant_id_id` ON `products` (`tenant_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_products_tenant_id_sku` ON `products` (`tenant_id`,`sku`);--> statement-breakpoint
CREATE INDEX `idx_products_tenant` ON `products` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `programs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`member_id` text,
	`trainer_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`content` text NOT NULL,
	`end_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`member_id`) REFERENCES `members`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`trainer_id`) REFERENCES `access`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_programs_tenant_id_id` ON `programs` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_programs_tenant` ON `programs` (`tenant_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bucket` integer NOT NULL,
	`count` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_rate_limits_user_id_bucket` ON `rate_limits` (`user_id`,`bucket`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`plan` text NOT NULL,
	`trial_until` text NOT NULL,
	`timezone` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `workout_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`member_id` text NOT NULL,
	`program_id` text NOT NULL,
	`day` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`member_id`) REFERENCES `members`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`program_id`) REFERENCES `programs`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_workout_sessions_tenant_id_id` ON `workout_sessions` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_workout_sessions_tenant` ON `workout_sessions` (`tenant_id`,`member_id`);