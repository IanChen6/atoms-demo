CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`project` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`status` text NOT NULL,
	`mode` text NOT NULL,
	`version` text,
	`created` integer NOT NULL,
	FOREIGN KEY (`project`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `messages_project_created` ON `messages` (`project`,`created`);