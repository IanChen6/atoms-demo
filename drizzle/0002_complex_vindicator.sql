CREATE TABLE `ai_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`created` integer NOT NULL,
	`lease` integer NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_calls_user_created` ON `ai_calls` (`user`,`created`);--> statement-breakpoint
CREATE INDEX `ai_calls_created` ON `ai_calls` (`created`);