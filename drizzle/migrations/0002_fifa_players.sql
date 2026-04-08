-- Migration: Add FIFA-style detailed player stats
-- This script updates the players table with detailed card stats

-- Add new columns to players table
ALTER TABLE `players`
  ADD COLUMN `league` VARCHAR(64) NULL AFTER `team`,
  ADD COLUMN `nation` VARCHAR(64) NULL AFTER `league`,
  ADD COLUMN `overall` INT NULL AFTER `position`,
  ADD COLUMN `pace` INT NULL AFTER `overall`,
  ADD COLUMN `shooting` INT NULL AFTER `pace`,
  ADD COLUMN `passing` INT NULL AFTER `shooting`,
  ADD COLUMN `dribbling` INT NULL AFTER `passing`,
  ADD COLUMN `defending` INT NULL AFTER `dribbling`,
  ADD COLUMN `physical` INT NULL AFTER `defending`,
  ADD COLUMN `diving` INT NULL AFTER `physical`,
  ADD COLUMN `handling` INT NULL AFTER `diving`,
  ADD COLUMN `kicking` INT NULL AFTER `handling`,
  ADD COLUMN `positioningGk` INT NULL AFTER `kicking`,
  ADD COLUMN `reflexes` INT NULL AFTER `positioningGk`,
  ADD COLUMN `faceImageUrl` TEXT NULL AFTER `imageUrl`,
  ADD COLUMN `height` INT NULL AFTER `faceImageUrl`,
  ADD COLUMN `weight` INT NULL AFTER `height`,
  ADD COLUMN `preferredFoot` ENUM('left', 'right') NULL AFTER `weight`,
  ADD COLUMN `weakFoot` INT NULL DEFAULT 3 AFTER `preferredFoot`,
  ADD COLUMN `skillMoves` INT NULL DEFAULT 3 AFTER `weakFoot`,
  ADD COLUMN `marketValue` INT NULL AFTER `skillMoves`,
  ADD COLUMN `cardQuality` ENUM('bronze', 'silver', 'gold', 'elite') NULL AFTER `marketValue`;

-- Migrate existing data: copy rating to overall, set nationality to nation
UPDATE `players`
SET
  `overall` = `rating`,
  `nation` = `nationality`,
  `cardQuality` = CASE
    WHEN `rating` >= 89 THEN 'elite'
    WHEN `rating` >= 75 THEN 'gold'
    WHEN `rating` >= 65 THEN 'silver'
    ELSE 'bronze'
  END
WHERE `overall` IS NULL;

-- Make overall and cardQuality NOT NULL after migration (run this separately after verifying data)
-- ALTER TABLE `players` MODIFY COLUMN `overall` INT NOT NULL;
-- ALTER TABLE `players` MODIFY COLUMN `cardQuality` ENUM('bronze', 'silver', 'gold', 'elite') NOT NULL;

-- Note: Old columns (rating, nationality) can be dropped later after verification
-- ALTER TABLE `players` DROP COLUMN `rating`;
-- ALTER TABLE `players` DROP COLUMN `nationality`;
