-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'photographer', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'withdrawn');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('inquiry', 'quoted', 'held', 'deposit_paid', 'confirmed', 'completed', 'delivered', 'closed', 'cancelled', 'disputed');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'image', 'file', 'location', 'system');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('deposit', 'balance', 'refund');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'cancelled', 'expired', 'failed');

-- CreateEnum
CREATE TYPE "CancelInitiator" AS ENUM ('customer', 'photographer', 'platform');

-- CreateEnum
CREATE TYPE "CancelFault" AS ENUM ('customer', 'photographer', 'force_majeure');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('scheduled', 'held', 'paid');

-- CreateEnum
CREATE TYPE "RevisionRequestType" AS ENUM ('skin', 'brightness_color', 'crop', 'background', 'glare', 'detail');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('requested', 'in_progress', 'done');

-- CreateEnum
CREATE TYPE "DisputeRaisedBy" AS ENUM ('customer', 'photographer');

-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('quality', 'noshow', 'delay', 'other');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'fact_check_requested', 'resolved', 'escalated');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('portfolio_full', 'portfolio_partial', 'portfolio_face_hidden', 'portfolio_none');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "phone_verified_at" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photographers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_reg_no" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "representative_name" TEXT NOT NULL,
    "settlement_account" TEXT NOT NULL,
    "settlement_account_holder" TEXT NOT NULL,
    "active_regions" TEXT[],
    "mood_tags" TEXT[],
    "categories" TEXT[],
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "is_new_photographer" BOOLEAN NOT NULL DEFAULT true,
    "completed_bookings_count" INTEGER NOT NULL DEFAULT 0,
    "avg_rating" DECIMAL(3,2),
    "response_time_avg_min" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photographers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shoot_categories" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "shoot_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" UUID NOT NULL,
    "photographer_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" UUID NOT NULL,
    "photographer_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "base_price" INTEGER NOT NULL,
    "included_photos" INTEGER NOT NULL,
    "retouch_scope" TEXT,
    "raw_included" BOOLEAN NOT NULL,
    "delivery_days" INTEGER NOT NULL,
    "options" JSONB,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "photographer_id" UUID NOT NULL,
    "package_id" UUID,
    "status" "BookingStatus" NOT NULL DEFAULT 'inquiry',
    "shoot_category_id" UUID NOT NULL,
    "shoot_datetime" TIMESTAMP(3),
    "location" TEXT,
    "headcount" INTEGER,
    "purpose" TEXT,
    "required_scenes" JSONB,
    "total_amount" INTEGER,
    "deposit_amount" INTEGER,
    "balance_amount" INTEGER,
    "hold_expires_at" TIMESTAMP(3),
    "balance_due_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_confirmations" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "confirmed_by_customer_at" TIMESTAMP(3),
    "confirmed_by_photographer_at" TIMESTAMP(3),

    CONSTRAINT "booking_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "contact_disclosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "chat_room_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "type" "MessageType" NOT NULL,
    "content" TEXT NOT NULL,
    "pii_flag" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "pg_provider" TEXT NOT NULL DEFAULT 'tosspayments',
    "pg_transaction_id" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "webhook_payload" JSONB,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellations" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "initiated_by" "CancelInitiator" NOT NULL,
    "fault" "CancelFault" NOT NULL,
    "rule_applied" TEXT NOT NULL,
    "refund_amount" INTEGER NOT NULL,
    "compensation_amount" INTEGER,
    "actual_cost_items" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" UUID NOT NULL,
    "photographer_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'scheduled',
    "held_reason" TEXT,
    "total_amount" INTEGER NOT NULL,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_items" (
    "id" UUID NOT NULL,
    "settlement_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "gross_amount" INTEGER NOT NULL,
    "platform_fee" INTEGER NOT NULL,
    "pg_fee" INTEGER NOT NULL,
    "deduction_amount" INTEGER NOT NULL DEFAULT 0,
    "net_amount" INTEGER NOT NULL,

    CONSTRAINT "settlement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "photo_urls" JSONB NOT NULL,
    "representative_photo_urls" JSONB,
    "delivered_at" TIMESTAMP(3),
    "download_expires_at" TIMESTAMP(3),
    "customer_confirmed_at" TIMESTAMP(3),

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_requests" (
    "id" UUID NOT NULL,
    "delivery_id" UUID NOT NULL,
    "photo_ref" TEXT NOT NULL,
    "request_type" "RevisionRequestType" NOT NULL,
    "description" TEXT,
    "status" "RevisionStatus" NOT NULL DEFAULT 'requested',

    CONSTRAINT "revision_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "rating_overall" INTEGER NOT NULL,
    "rating_kindness" INTEGER NOT NULL,
    "rating_punctual" INTEGER NOT NULL,
    "rating_communication" INTEGER NOT NULL,
    "rating_speed" INTEGER NOT NULL,
    "will_reuse" BOOLEAN NOT NULL,
    "category" TEXT,
    "content" TEXT,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "raised_by" "DisputeRaisedBy" NOT NULL,
    "type" "DisputeType" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "photographer_response_due_at" TIMESTAMP(3),
    "resolution" TEXT,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "type" "ConsentType" NOT NULL,
    "minor_included" BOOLEAN NOT NULL DEFAULT false,
    "guardian_consent_at" TIMESTAMP(3),

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "photographers_user_id_key" ON "photographers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "shoot_categories_code_key" ON "shoot_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_booking_id_key" ON "chat_rooms"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "settlement_items_booking_id_key" ON "settlement_items"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");

-- AddForeignKey
ALTER TABLE "photographers" ADD CONSTRAINT "photographers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_photographer_id_fkey" FOREIGN KEY ("photographer_id") REFERENCES "photographers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "shoot_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_photographer_id_fkey" FOREIGN KEY ("photographer_id") REFERENCES "photographers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_photographer_id_fkey" FOREIGN KEY ("photographer_id") REFERENCES "photographers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_shoot_category_id_fkey" FOREIGN KEY ("shoot_category_id") REFERENCES "shoot_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_confirmations" ADD CONSTRAINT "booking_confirmations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_room_id_fkey" FOREIGN KEY ("chat_room_id") REFERENCES "chat_rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellations" ADD CONSTRAINT "cancellations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_photographer_id_fkey" FOREIGN KEY ("photographer_id") REFERENCES "photographers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_items" ADD CONSTRAINT "settlement_items_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_items" ADD CONSTRAINT "settlement_items_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_requests" ADD CONSTRAINT "revision_requests_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
