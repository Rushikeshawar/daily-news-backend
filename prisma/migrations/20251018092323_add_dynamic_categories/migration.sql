/*
  Warnings:

  - You are about to drop the column `created_by` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `categories` table. All the data in the column will be lost.
  - Made the column `category_id` on table `news_articles` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `news_articles` DROP FOREIGN KEY `news_articles_category_id_fkey`;

-- AlterTable
ALTER TABLE `categories` DROP COLUMN `created_by`,
    DROP COLUMN `updated_by`;

-- AlterTable
ALTER TABLE `news_articles` MODIFY `category_id` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `news_articles` ADD CONSTRAINT `news_articles_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
