-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'SHORT_ANSWER', 'MATCH_PAIR');

-- CreateTable
CREATE TABLE "Test" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "moduleId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "totalMarks" INTEGER NOT NULL DEFAULT 0,
    "status" "TestStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "marks" INTEGER NOT NULL,
    "orderNo" INTEGER NOT NULL,
    "correctAnswer" TEXT,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchPair" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "leftText" TEXT NOT NULL,
    "rightText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchPair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_testId_idx" ON "Question"("testId");

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPair" ADD CONSTRAINT "MatchPair_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
