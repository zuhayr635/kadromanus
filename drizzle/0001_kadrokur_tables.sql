CREATE TABLE `gameHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`licenseId` int NOT NULL,
	`tiktokUsername` varchar(64) NOT NULL,
	`finalScores` json NOT NULL,
	`statistics` json NOT NULL,
	`durationSeconds` int,
	`totalCardsOpened` int DEFAULT 0,
	`totalParticipants` int DEFAULT 0,
	`screenshotUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gameHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `giftTiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`giftName` varchar(64) NOT NULL,
	`giftId` int NOT NULL,
	`tierLevel` enum('1','2','3') NOT NULL,
	`cardQuality` enum('bronze','silver','gold','elite') NOT NULL,
	CONSTRAINT `giftTiers_id` PRIMARY KEY(`id`),
	CONSTRAINT `giftTiers_giftName_unique` UNIQUE(`giftName`)
);
--> statement-breakpoint
CREATE TABLE `licenseLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseId` int NOT NULL,
	`action` varchar(64) NOT NULL,
	`details` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `licenseLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `licenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseKey` varchar(64) NOT NULL,
	`ownerName` text NOT NULL,
	`ownerEmail` varchar(320),
	`ownerTikTok` varchar(64),
	`planType` enum('basic','pro','premium','unlimited') NOT NULL DEFAULT 'basic',
	`status` enum('active','suspended','expired','revoked') NOT NULL DEFAULT 'active',
	`maxSessions` int NOT NULL DEFAULT 1,
	`allowedFeatures` json,
	`totalUsageCount` int DEFAULT 0,
	`lastUsedAt` timestamp,
	`lastUsedIp` varchar(45),
	`activatedAt` timestamp,
	`expiresAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `licenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `licenses_licenseKey_unique` UNIQUE(`licenseKey`)
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`team` varchar(64) NOT NULL,
	`position` varchar(32) NOT NULL,
	`rating` int DEFAULT 75,
	`nationality` varchar(64),
	`imageUrl` text,
	CONSTRAINT `players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`licenseId` int NOT NULL,
	`tiktokUsername` varchar(64) NOT NULL,
	`status` enum('active','paused','ended','error') NOT NULL DEFAULT 'active',
	`pythonPid` int,
	`gameState` json,
	`teamSettings` json,
	`gameSettings` json,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `usedPlayers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`playerId` int NOT NULL,
	`teamIndex` int NOT NULL,
	`position` varchar(32) NOT NULL,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`replacedBy` int,
	CONSTRAINT `usedPlayers_id` PRIMARY KEY(`id`)
);
