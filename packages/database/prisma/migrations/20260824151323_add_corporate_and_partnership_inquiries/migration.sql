-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('standard', 'custom_contract', 'partnership');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('received', 'reviewing', 'matched', 'closed');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "deal_type" "DealType" NOT NULL DEFAULT 'standard';

-- CreateTable
CREATE TABLE "corporate_inquiries" (
    "id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "shoot_date" TIMESTAMP(3),
    "location" TEXT,
    "purpose" TEXT,
    "capture_mode_code" TEXT,
    "expected_duration_min" INTEGER,
    "expected_headcount" INTEGER,
    "deliverable_usage" TEXT,
    "budget_range" TEXT,
    "tax_invoice_required" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'received',
    "admin_memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partnership_inquiries" (
    "id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company_type" TEXT NOT NULL,
    "collaboration_type" TEXT,
    "proposal" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'received',
    "admin_memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partnership_inquiries_pkey" PRIMARY KEY ("id")
);
