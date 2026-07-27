import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const tickets = await db.supportTicket.findMany({
      where: { userId: auth.userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    console.error('Fetch support tickets error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { subject, description } = await req.json();
    if (!subject || !description) {
      return NextResponse.json({ success: false, error: 'Subject and description required' }, { status: 400 });
    }

    const ticket = await db.supportTicket.create({
      data: { userId: auth.userId, subject, status: 'OPEN' },
    });

    await db.ticketMessage.create({
      data: { ticketId: ticket.id, senderId: auth.userId, senderType: 'USER', content: description },
    });

    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Create ticket error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create ticket' }, { status: 500 });
  }
}
