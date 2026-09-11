ALTER TABLE `projects` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `instructions` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `review_status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `review_version` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `review_requested_at` integer;