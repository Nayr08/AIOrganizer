-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "frequency" TEXT,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentTaskId" TEXT,
ADD COLUMN     "recurringDay" TEXT;
