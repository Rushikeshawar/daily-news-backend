-- CreateTable
CREATE TABLE `ai_articles` (
    `id` VARCHAR(191) NOT NULL,
    `headline` VARCHAR(500) NOT NULL,
    `brief_content` TEXT NULL,
    `full_content` LONGTEXT NULL,
    `category` VARCHAR(191) NOT NULL,
    `featured_image` VARCHAR(191) NULL,
    `tags` TEXT NULL,
    `ai_model` VARCHAR(191) NULL,
    `ai_application` VARCHAR(191) NULL,
    `company_mentioned` VARCHAR(191) NULL,
    `technology_type` VARCHAR(191) NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `share_count` INTEGER NOT NULL DEFAULT 0,
    `relevance_score` DECIMAL(10, 2) NULL,
    `is_trending` BOOLEAN NOT NULL DEFAULT false,
    `published_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `icon_url` VARCHAR(191) NULL,
    `article_count` INTEGER NOT NULL DEFAULT 0,
    `is_hot` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_article_views` (
    `id` VARCHAR(191) NOT NULL,
    `article_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_article_interactions` (
    `id` VARCHAR(191) NOT NULL,
    `article_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `interaction_type` ENUM('SHARE', 'BOOKMARK', 'LIKE', 'COMMENT', 'DOWNLOAD') NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `time_saver_content` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `summary` TEXT NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `image_url` VARCHAR(191) NULL,
    `icon_name` VARCHAR(191) NULL,
    `bg_color` VARCHAR(191) NULL,
    `key_points` TEXT NULL,
    `source_url` VARCHAR(191) NULL,
    `read_time_seconds` INTEGER NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `is_priority` BOOLEAN NOT NULL DEFAULT false,
    `content_type` ENUM('DIGEST', 'QUICK_UPDATE', 'BRIEFING', 'SUMMARY', 'HIGHLIGHTS') NOT NULL,
    `published_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `content_group` VARCHAR(191) NULL,
    `tags` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quick_updates` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `brief` TEXT NULL,
    `category` VARCHAR(191) NOT NULL,
    `image_url` VARCHAR(191) NULL,
    `tags` TEXT NULL,
    `is_hot` BOOLEAN NOT NULL DEFAULT false,
    `engagement_score` INTEGER NOT NULL DEFAULT 0,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `content_group` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `breaking_news` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `brief` TEXT NULL,
    `image_url` VARCHAR(191) NULL,
    `source_url` VARCHAR(191) NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `location` VARCHAR(191) NULL,
    `tags` TEXT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `content_group` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `time_saver_views` (
    `id` VARCHAR(191) NOT NULL,
    `content_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `time_saver_interactions` (
    `id` VARCHAR(191) NOT NULL,
    `content_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `interaction_type` ENUM('SHARE', 'BOOKMARK', 'LIKE', 'SAVE_FOR_LATER', 'MARK_AS_READ') NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_article_views` ADD CONSTRAINT `ai_article_views_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `ai_articles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_article_views` ADD CONSTRAINT `ai_article_views_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_article_interactions` ADD CONSTRAINT `ai_article_interactions_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `ai_articles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_article_interactions` ADD CONSTRAINT `ai_article_interactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_saver_views` ADD CONSTRAINT `time_saver_views_content_id_fkey` FOREIGN KEY (`content_id`) REFERENCES `time_saver_content`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_saver_views` ADD CONSTRAINT `time_saver_views_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_saver_interactions` ADD CONSTRAINT `time_saver_interactions_content_id_fkey` FOREIGN KEY (`content_id`) REFERENCES `time_saver_content`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_saver_interactions` ADD CONSTRAINT `time_saver_interactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
