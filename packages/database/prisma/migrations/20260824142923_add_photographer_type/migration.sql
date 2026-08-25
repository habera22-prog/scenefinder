-- CreateEnum
CREATE TYPE "PhotographerType" AS ENUM ('business', 'freelancer');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "tax_invoice_required" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "photographers" ADD COLUMN     "photographer_type" "PhotographerType" NOT NULL DEFAULT 'business',
ALTER COLUMN "business_reg_no" DROP NOT NULL,
ALTER COLUMN "business_name" DROP NOT NULL,
ALTER COLUMN "representative_name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "shoot_categories" ADD COLUMN     "business_only" BOOLEAN NOT NULL DEFAULT false;
