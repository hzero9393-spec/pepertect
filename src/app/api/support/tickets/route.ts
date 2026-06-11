import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/trade-auth'

// GET /api/support/tickets - List user's tickets
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error
    const userId = auth.userId

    const tickets = await db.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('[Tickets API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

// POST /api/support/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error
    const userId = auth.userId

    const body = await request.json()
    const { subject, message, category, priority } = body

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const validCategories = ['GENERAL', 'BUG', 'FEATURE', 'ACCOUNT', 'TRADING']
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

    const ticket = await db.supportTicket.create({
      data: {
        userId,
        subject: subject.trim(),
        message: message.trim(),
        category: validCategories.includes(category) ? category : 'GENERAL',
        priority: validPriorities.includes(priority) ? priority : 'MEDIUM',
        status: 'OPEN',
      },
    })

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    console.error('[Tickets API] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
}
