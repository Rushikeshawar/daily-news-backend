-- AlterTable
ALTER TABLE `ai_articles` ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `time_saver_content` ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `linked_ai_article_id` VARCHAR(191) NULL,
    ADD COLUMN `linked_article_id` VARCHAR(191) NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `time_saver_content_linked_article_id_idx` ON `time_saver_content`(`linked_article_id`);

-- CreateIndex
CREATE INDEX `time_saver_content_linked_ai_article_id_idx` ON `time_saver_content`(`linked_ai_article_id`);

-- AddForeignKey
ALTER TABLE `ai_articles` ADD CONSTRAINT `ai_articles_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_saver_content` ADD CONSTRAINT `time_saver_content_linked_article_id_fkey` FOREIGN KEY (`linked_article_id`) REFERENCES `news_articles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_saver_content` ADD CONSTRAINT `time_saver_content_linked_ai_article_id_fkey` FOREIGN KEY (`linked_ai_article_id`) REFERENCES `ai_articles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_saver_content` ADD CONSTRAINT `time_saver_content_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
