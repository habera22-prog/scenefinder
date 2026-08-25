-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('active', 'superseded');

-- DropIndex
DROP INDEX "contracts_booking_id_key";

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "change_reason" TEXT,
ADD COLUMN     "previous_version_id" UUID,
ADD COLUMN     "status" "ContractStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "contracts_booking_id_version_key" ON "contracts"("booking_id", "version");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_previous_version_id_fkey" FOREIGN KEY ("previous_version_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

