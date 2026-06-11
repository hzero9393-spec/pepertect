import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/trade-auth'

// DELETE /api/support/tickets/[id] - Close/delete a ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error
    const userId = auth.userId
    const { id } = await params

    const ticket = await db.supportTicket.findFirst({
      where: { id, userId },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    await db.supportTicket.update({
      where: { id },
      data: { status: 'CLOSED' },
    })

    return NextResponse.json({ message: 'Ticket closed successfully' })
  } catch (error) {
    console.error('[Tickets API] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to close ticket' },
      { status: 500 }
    )
  }
}
