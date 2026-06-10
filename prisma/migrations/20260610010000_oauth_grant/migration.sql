-- CreateTable
CREATE TABLE "OAuthGrant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scopes" TEXT[],
    "code" TEXT,
    "codeExpiresAt" TEXT,
    "accessToken" TEXT,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "OAuthGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthGrant_code_key" ON "OAuthGrant"("code");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthGrant_accessToken_key" ON "OAuthGrant"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthGrant_productId_userId_key" ON "OAuthGrant"("productId", "userId");

