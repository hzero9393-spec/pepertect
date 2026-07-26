import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

// Backwards-compat alias — many files import { prisma }
export const prisma = db

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db