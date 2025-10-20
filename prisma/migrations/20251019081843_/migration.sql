/*
  Warnings:

  - You are about to drop the column `category_id` on the `news_articles` table. All the data in the column will be lost.
  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `category` to the `news_articles` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `news_articles` DROP FOREIGN KEY `news_articles_category_id_fkey`;

-- AlterTable
ALTER TABLE `news_articles` DROP COLUMN `category_id`,
    ADD COLUMN `category` ENUM('GENERAL', 'NATIONAL', 'INTERNATIONAL', 'POLITICS', 'BUSINESS', 'TECHNOLOGY', 'SCIENCE', 'HEALTH', 'EDUCATION', 'ENVIRONMENT', 'SPORTS', 'ENTERTAINMENT', 'CRIME', 'LIFESTYLE', 'FINANCE', 'FOOD', 'FASHION', 'OTHERS') NOT NULL;

-- DropTable
DROP TABLE `categories`;
