CREATE TABLE `class_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`session_id` text NOT NULL,
	`member_id` text NOT NULL,
	`status` text NOT NULL,
	`queued_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`session_id`) REFERENCES `class_sessions`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`member_id`) REFERENCES `members`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "class_booking_status" CHECK("class_bookings"."status" IN ('BOOKED','WAITLIST','CANCELLED','ATTENDED','NO_SHOW'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_class_booking_member` ON `class_bookings` (`tenant_id`,`session_id`,`member_id`);--> statement-breakpoint
CREATE INDEX `idx_class_roster` ON `class_bookings` (`tenant_id`,`session_id`,`status`,`queued_at`);--> statement-breakpoint
CREATE INDEX `idx_class_member` ON `class_bookings` (`tenant_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `class_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`trainer_id` text,
	`name` text NOT NULL,
	`room` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`capacity` integer NOT NULL,
	`status` text DEFAULT 'SCHEDULED' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`branch_id`) REFERENCES `branches`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`trainer_id`) REFERENCES `access`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "class_capacity" CHECK("class_sessions"."capacity" BETWEEN 1 AND 200),
	CONSTRAINT "class_times" CHECK("class_sessions"."ends_at">"class_sessions"."starts_at"),
	CONSTRAINT "class_status" CHECK("class_sessions"."status" IN ('SCHEDULED','CANCELLED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_class_sessions_tenant_id` ON `class_sessions` (`tenant_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_class_schedule` ON `class_sessions` (`tenant_id`,`starts_at`,`id`);