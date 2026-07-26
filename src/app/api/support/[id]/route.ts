import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ success: false, error: 'Message content required' }, { status: 400 });
    }

    const ticket = await db.supportTicket.findFirst({ where: { id, userId: auth.userId } });
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    await db.supportTicket.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    const message = await db.ticketMessage.create({
      data: { ticketId: id, senderId: auth.userId, senderType: 'USER', content },
    });

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}
