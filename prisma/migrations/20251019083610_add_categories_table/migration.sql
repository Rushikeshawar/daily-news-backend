-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `icon_url` VARCHAR(191) NULL,
    `color` VARCHAR(7) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_name_key`(`name`),
    UNIQUE INDEX `categories_slug_key`(`slug`),
    INDEX `categories_is_active_idx`(`is_active`),
    INDEX `categories_sort_order_idx`(`sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `advertisements_is_active_idx` ON `advertisements`(`is_active`);

-- CreateIndex
CREATE INDEX `advertisements_start_date_end_date_idx` ON `advertisements`(`start_date`, `end_date`);

-- CreateIndex
CREATE INDEX `ai_articles_category_idx` ON `ai_articles`(`category`);

-- CreateIndex
CREATE INDEX `ai_articles_is_trending_idx` ON `ai_articles`(`is_trending`);

-- CreateIndex
CREATE INDEX `ai_articles_published_at_idx` ON `ai_articles`(`published_at`);

-- CreateIndex
CREATE INDEX `breaking_news_priority_idx` ON `breaking_news`(`priority`);

-- CreateIndex
CREATE INDEX `breaking_news_timestamp_idx` ON `breaking_news`(`timestamp`);

-- CreateIndex
CREATE INDEX `news_articles_category_idx` ON `news_articles`(`category`);

-- CreateIndex
CREATE INDEX `news_articles_status_idx` ON `news_articles`(`status`);

-- CreateIndex
CREATE INDEX `news_articles_published_at_idx` ON `news_articles`(`published_at`);

-- CreateIndex
CREATE INDEX `notifications_is_read_idx` ON `notifications`(`is_read`);

-- CreateIndex
CREATE INDEX `quick_updates_category_idx` ON `quick_updates`(`category`);

-- CreateIndex
CREATE INDEX `quick_updates_timestamp_idx` ON `quick_updates`(`timestamp`);

-- CreateIndex
CREATE INDEX `search_history_created_at_idx` ON `search_history`(`created_at`);

-- CreateIndex
CREATE INDEX `time_saver_content_category_idx` ON `time_saver_content`(`category`);

-- CreateIndex
CREATE INDEX `time_saver_content_published_at_idx` ON `time_saver_content`(`published_at`);

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `ai_article_interactions` RENAME INDEX `ai_article_interactions_article_id_fkey` TO `ai_article_interactions_article_id_idx`;

-- RenameIndex
ALTER TABLE `ai_article_interactions` RENAME INDEX `ai_article_interactions_user_id_fkey` TO `ai_article_interactions_user_id_idx`;

-- RenameIndex
ALTER TABLE `ai_article_views` RENAME INDEX `ai_article_views_article_id_fkey` TO `ai_article_views_article_id_idx`;

-- RenameIndex
ALTER TABLE `ai_article_views` RENAME INDEX `ai_article_views_user_id_fkey` TO `ai_article_views_user_id_idx`;

-- RenameIndex
ALTER TABLE `approval_history` RENAME INDEX `approval_history_approver_id_fkey` TO `approval_history_approver_id_idx`;

-- RenameIndex
ALTER TABLE `approval_history` RENAME INDEX `approval_history_news_id_fkey` TO `approval_history_news_id_idx`;

-- RenameIndex
ALTER TABLE `notifications` RENAME INDEX `notifications_user_id_fkey` TO `notifications_user_id_idx`;

-- RenameIndex
ALTER TABLE `search_history` RENAME INDEX `search_history_user_id_fkey` TO `search_history_user_id_idx`;

-- RenameIndex
ALTER TABLE `time_saver_interactions` RENAME INDEX `time_saver_interactions_content_id_fkey` TO `time_saver_interactions_content_id_idx`;

-- RenameIndex
ALTER TABLE `time_saver_interactions` RENAME INDEX `time_saver_interactions_user_id_fkey` TO `time_saver_interactions_user_id_idx`;

-- RenameIndex
ALTER TABLE `time_saver_views` RENAME INDEX `time_saver_views_content_id_fkey` TO `time_saver_views_content_id_idx`;

-- RenameIndex
ALTER TABLE `time_saver_views` RENAME INDEX `time_saver_views_user_id_fkey` TO `time_saver_views_user_id_idx`;
