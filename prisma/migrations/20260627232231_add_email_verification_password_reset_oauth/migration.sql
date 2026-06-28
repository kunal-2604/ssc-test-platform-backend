/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifyTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifyTokenHash" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordResetTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetTokenHash" TEXT,
ADD COLUMN     "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
