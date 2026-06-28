-- CreateTable
CREATE TABLE "StudentSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentSession_userId_idx" ON "StudentSession"("userId");

-- CreateIndex
CREATE INDEX "StudentSession_deviceId_idx" ON "StudentSession"("deviceId");

-- AddForeignKey
ALTER TABLE "StudentSession" ADD CONSTRAINT "StudentSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
