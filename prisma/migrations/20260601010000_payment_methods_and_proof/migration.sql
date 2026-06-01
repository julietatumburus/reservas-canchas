-- AlterTable: medios de pago en Club + ventana de comprobante
ALTER TABLE "Club"
ADD COLUMN "mpEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "whatsappPhone" TEXT,
ADD COLUMN "proofWindowMinutes" INTEGER NOT NULL DEFAULT 15;

-- AlterTable: vencimiento del comprobante en Booking
ALTER TABLE "Booking"
ADD COLUMN "proofDeadline" TIMESTAMP(3);
