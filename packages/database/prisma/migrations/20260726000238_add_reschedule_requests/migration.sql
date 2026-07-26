-- CreateEnum
CREATE TYPE "RescheduleRequestedBy" AS ENUM ('customer', 'photographer');

-- CreateEnum
CREATE TYPE "RescheduleStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "reschedule_requests" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "requested_by" "RescheduleRequestedBy" NOT NULL,
    "new_shoot_datetime" TIMESTAMP(3),
    "new_location" TEXT,
    "reason" TEXT,
    "status" "RescheduleStatus" NOT NULL DEFAULT 'pending',
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reschedule_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
