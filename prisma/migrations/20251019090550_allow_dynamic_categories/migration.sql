/*
  Warnings:

  - You are about to alter the column `category` on the `news_articles` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(9))` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `news_articles` MODIFY `category` VARCHAR(191) NOT NULL;
