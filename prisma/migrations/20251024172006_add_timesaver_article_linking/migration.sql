/*
  Warnings:

  - You are about to drop the column `updated_by` on the `time_saver_content` table. All the data in the column will be lost.
  - You are about to drop the `quick_updates` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `time_saver_content` DROP COLUMN `updated_by`,
    MODIFY `content_type` ENUM('DIGEST', 'QUICK_UPDATE', 'BRIEFING', 'SUMMARY', 'HIGHLIGHTS', 'ARTICLE', 'AI_ML', 'VIDEO', 'PODCAST', 'INFOGRAPHIC') NOT NULL;

-- DropTable
DROP TABLE `quick_updates`;

-- CreateTable
CREATE TABLE `_ArticleToTimeSaver` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_ArticleToTimeSaver_AB_unique`(`A`, `B`),
    INDEX `_ArticleToTimeSaver_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_AiArticleToTimeSaver` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_AiArticleToTimeSaver_AB_unique`(`A`, `B`),
    INDEX `_AiArticleToTimeSaver_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `time_saver_content_is_priority_idx` ON `time_saver_content`(`is_priority`);

-- CreateIndex
CREATE INDEX `time_saver_content_content_type_idx` ON `time_saver_content`(`content_type`);

-- AddForeignKey
ALTER TABLE `_ArticleToTimeSaver` ADD CONSTRAINT `_ArticleToTimeSaver_A_fkey` FOREIGN KEY (`A`) REFERENCES `news_articles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ArticleToTimeSaver` ADD CONSTRAINT `_ArticleToTimeSaver_B_fkey` FOREIGN KEY (`B`) REFERENCES `time_saver_content`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AiArticleToTimeSaver` ADD CONSTRAINT `_AiArticleToTimeSaver_A_fkey` FOREIGN KEY (`A`) REFERENCES `ai_articles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AiArticleToTimeSaver` ADD CONSTRAINT `_AiArticleToTimeSaver_B_fkey` FOREIGN KEY (`B`) REFERENCES `time_saver_content`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
