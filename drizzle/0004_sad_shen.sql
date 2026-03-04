CREATE TABLE `ai_model_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`provider` varchar(64) NOT NULL DEFAULT 'deepseek',
	`apiKey` text NOT NULL,
	`baseUrl` varchar(512) NOT NULL,
	`model` varchar(128) NOT NULL,
	`imageDetail` varchar(16) NOT NULL DEFAULT 'high',
	`maxTokens` int NOT NULL DEFAULT 512,
	`isActive` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_model_config_id` PRIMARY KEY(`id`)
);
