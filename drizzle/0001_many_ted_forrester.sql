CREATE TABLE `bird_sightings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`speciesNameZh` varchar(128) NOT NULL,
	`speciesNameEn` varchar(128) NOT NULL,
	`scientificName` varchar(128) NOT NULL,
	`taxonomy` varchar(128),
	`confidence` float NOT NULL DEFAULT 0,
	`originalPicUrl` text,
	`s3PicUrl` text,
	`s3Key` varchar(512),
	`deviceSerial` varchar(64),
	`description` text,
	`capturedAt` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bird_sightings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `camera_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`appKey` varchar(128) NOT NULL,
	`appSecret` varchar(256) NOT NULL,
	`deviceSerial` varchar(64) NOT NULL,
	`channelNo` int NOT NULL DEFAULT 1,
	`cachedToken` text,
	`tokenExpireAt` bigint,
	`isActive` boolean NOT NULL DEFAULT false,
	`pollIntervalMs` int NOT NULL DEFAULT 10000,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `camera_configs_id` PRIMARY KEY(`id`)
);
