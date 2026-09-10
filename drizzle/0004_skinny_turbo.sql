CREATE TABLE `app_data` (
	`project` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated` integer NOT NULL,
	FOREIGN KEY (`project`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
