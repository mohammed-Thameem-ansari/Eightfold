import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Mock Prisma for development without database
// TODO: Set up PostgreSQL and configure DATABASE_URL
const createMockPrisma = () => {
  return {
    user: {
      findUnique: async () => null,
      create: async (data: any) => data,
      update: async (data: any) => data,
    },
    session: {
      findUnique: async () => null,
      create: async (data: any) => data,
      delete: async () => ({}),
    },
    $disconnect: async () => {},
  } as any
}

export const prisma = globalForPrisma.prisma ?? (
  process.env.DATABASE_URL 
    ? new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      })
    : createMockPrisma()
)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
