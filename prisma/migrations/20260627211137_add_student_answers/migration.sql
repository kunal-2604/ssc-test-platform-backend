-- CreateTable
CREATE TABLE "StudentAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerJson" TEXT,
    "isCorrect" BOOLEAN,
    "marksAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentAnswer_attemptId_idx" ON "StudentAnswer"("attemptId");

-- CreateIndex
CREATE INDEX "StudentAnswer_questionId_idx" ON "StudentAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAnswer_attemptId_questionId_key" ON "StudentAnswer"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
