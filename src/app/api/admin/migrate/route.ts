import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// This endpoint creates the Admin, ActivityLog, and PlatformSettings tables
// if they don't exist yet in the production database.
// It should be called once after deployment to set up the schema.
export async function GET() {
  try {
    // Try to query the Admin table - if it fails, the table doesn't exist
    try {
      await db.admin.findFirst()
      console.log('[Migration] Admin table already exists')
    } catch {
      console.log('[Migration] Creating Admin table...')
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS admins (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          "passwordHash" TEXT NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL DEFAULT 'ADMIN',
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "lastLoginAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)
      console.log('[Migration] Admin table created')
    }

    // Try to query ActivityLog table
    try {
      await db.activityLog.findFirst()
      console.log('[Migration] ActivityLog table already exists')
    } catch {
      console.log('[Migration] Creating ActivityLog table...')
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id TEXT PRIMARY KEY,
          "adminId" TEXT NOT NULL,
          action TEXT NOT NULL,
          "targetId" TEXT,
          details TEXT,
          "ipAddress" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS activity_logs_adminId_idx ON activity_logs("adminId");
        CREATE INDEX IF NOT EXISTS activity_logs_action_idx ON activity_logs(action);
        CREATE INDEX IF NOT EXISTS activity_logs_createdAt_idx ON activity_logs("createdAt");
        ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_adminId_fkey
          FOREIGN KEY ("adminId") REFERENCES admins(id) ON DELETE CASCADE ON UPDATE CASCADE;
      `)
      console.log('[Migration] ActivityLog table created')
    }

    // Try to query PlatformSettings table
    try {
      await db.platformSettings.findFirst()
      console.log('[Migration] PlatformSettings table already exists')
    } catch {
      console.log('[Migration] Creating PlatformSettings table...')
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS platform_settings (
          id TEXT PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          description TEXT,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)
      console.log('[Migration] PlatformSettings table created')
    }

    // Create default admin if not exists
    const adminCount = await db.admin.count()
    if (adminCount === 0) {
      const bcrypt = await import('bcryptjs')
      const salt = await bcrypt.genSalt(12)
      const hash = await bcrypt.hash('admin000', salt)
      await db.$executeRawUnsafe(`
        INSERT INTO admins (id, username, "passwordHash", name, email, role, "isActive", "createdAt", "updatedAt")
        VALUES ('admin-default-001', 'admin', '${hash}', 'Super Admin', 'admin@pepertect.com', 'SUPER_ADMIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `)
      console.log('[Migration] Default admin created')
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      adminCount: await db.admin.count(),
    })
  } catch (error) {
    console.error('[Migration] Error:', error)
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 })
  }
}
