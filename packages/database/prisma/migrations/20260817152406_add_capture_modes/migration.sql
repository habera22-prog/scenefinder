-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "capture_mode_id" UUID;

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "capture_mode_code" TEXT;

-- AlterTable
ALTER TABLE "photographers" ADD COLUMN     "capture_capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "capture_modes" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "capture_modes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "capture_modes_code_key" ON "capture_modes"("code");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_capture_mode_id_fkey" FOREIGN KEY ("capture_mode_id") REFERENCES "capture_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
