CREATE TABLE `system_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(64) NOT NULL,
	`configValue` text NOT NULL,
	`description` varchar(256),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_config_configKey_unique` UNIQUE(`configKey`)
);
--> statement-breakpoint
ALTER TABLE `bird_sightings` ADD `reviewStatus` enum('auto_approved','pending_review','approved','rejected') DEFAULT 'auto_approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `bird_sightings` ADD `reviewedBy` int;--> statement-breakpoint
ALTER TABLE `bird_sightings` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `bird_sightings` ADD `reviewNote` text;