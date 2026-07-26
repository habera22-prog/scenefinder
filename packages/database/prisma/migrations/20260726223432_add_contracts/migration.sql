-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "customer_signed_at" TIMESTAMP(3),
    "photographer_signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contracts_booking_id_key" ON "contracts"("booking_id");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
