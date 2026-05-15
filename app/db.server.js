import { PrismaClient } from "@prisma/client";

const prisma = global.prismaGlobal ?? new PrismaClient({
  log: ['error', 'warn'],
});

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

async function ensureSessionTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL,
        "shop" TEXT NOT NULL,
        "state" TEXT NOT NULL,
        "isOnline" BOOLEAN NOT NULL DEFAULT false,
        "scope" TEXT,
        "expires" TIMESTAMP(3),
        "accessToken" TEXT NOT NULL,
        "userId" BIGINT,
        "firstName" TEXT,
        "lastName" TEXT,
        "email" TEXT,
        "accountOwner" BOOLEAN NOT NULL DEFAULT false,
        "locale" TEXT,
        "collaborator" BOOLEAN DEFAULT false,
        "emailVerified" BOOLEAN DEFAULT false,
        CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log("Session table ready");
  } catch (e) {
    console.log("Session table note:", e.message);
  }
}

ensureSessionTable();

export default prisma;
