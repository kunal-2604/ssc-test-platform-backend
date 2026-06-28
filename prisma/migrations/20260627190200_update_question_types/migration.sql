/*
  Warnings:

  - The values [SHORT_ANSWER] on the enum `QuestionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "QuestionType_new" AS ENUM ('MCQ', 'MATCH_PAIR', 'ODD_ONE_OUT', 'TRUE_FALSE', 'WRONG_PAIR', 'CORRELATION', 'ONE_WORD', 'FILL_BLANK');
ALTER TABLE "Question" ALTER COLUMN "questionType" TYPE "QuestionType_new" USING ("questionType"::text::"QuestionType_new");
ALTER TYPE "QuestionType" RENAME TO "QuestionType_old";
ALTER TYPE "QuestionType_new" RENAME TO "QuestionType";
DROP TYPE "public"."QuestionType_old";
COMMIT;
