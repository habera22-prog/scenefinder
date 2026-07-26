-- CreateTable
CREATE TABLE "photographer_availability" (
    "id" UUID NOT NULL,
    "photographer_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photographer_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "photographer_availability_photographer_id_date_key" ON "photographer_availability"("photographer_id", "date");

-- AddForeignKey
ALTER TABLE "photographer_availability" ADD CONSTRAINT "photographer_availability_photographer_id_fkey" FOREIGN KEY ("photographer_id") REFERENCES "photographers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
