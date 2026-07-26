/*
  Warnings:

  - Added the required column `original_balance_amount` to the `coupon_redemptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `original_deposit_amount` to the `coupon_redemptions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "coupon_redemptions" ADD COLUMN     "original_balance_amount" INTEGER NOT NULL,
ADD COLUMN     "original_deposit_amount" INTEGER NOT NULL;
