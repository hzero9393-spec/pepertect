import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrate: {
    async url() {
      const tursoUrl = process.env.TURSO_DATABASE_URL
      const tursoToken = process.env.TURSO_AUTH_TOKEN
      if (tursoUrl && tursoToken) {
        return tursoUrl
      }
      return process.env.DATABASE_URL || 'file:./db/custom.db'
    },
  },
  db: {
    async url() {
      const tursoUrl = process.env.TURSO_DATABASE_URL
      const tursoToken = process.env.TURSO_AUTH_TOKEN
      if (tursoUrl && tursoToken) {
        return tursoUrl
      }
      return process.env.DATABASE_URL || 'file:./db/custom.db'
    },
  },
})
