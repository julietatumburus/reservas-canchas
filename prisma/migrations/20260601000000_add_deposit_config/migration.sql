-- CreateEnum
CREATE TYPE "DepositMode" AS ENUM ('NONE', 'FIXED', 'PERCENT');

-- AlterTable
ALTER TABLE "Club"
ADD COLUMN "depositMode" "DepositMode" NOT NULL DEFAULT 'NONE',
ADD COLUMN "depositAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "depositPercent" INTEGER NOT NULL DEFAULT 0;
