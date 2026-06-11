import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/trade-auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error
    const userId = auth.userId

    const body = await request.json()
    const { action, amount } = body

    if (!action || !['add', 'withdraw'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "add" or "withdraw"' },
        { status: 400 }
      )
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    if (amount > 10000000) {
      return NextResponse.json(
        { error: 'Amount cannot exceed ₹1,00,00,000' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let newBalance = user.virtualBalance

    if (action === 'add') {
      newBalance += amount
    } else {
      if (amount > newBalance) {
        return NextResponse.json(
          { error: `Insufficient balance. Available: ₹${newBalance.toLocaleString('en-IN')}` },
          { status: 400 }
        )
      }
      newBalance -= amount
    }

    await db.user.update({
      where: { id: userId },
      data: { virtualBalance: newBalance },
    })

    return NextResponse.json({
      message: action === 'add'
        ? `₹${amount.toLocaleString('en-IN')} added successfully`
        : `₹${amount.toLocaleString('en-IN')} withdrawn successfully`,
      newBalance,
    })
  } catch (error) {
    console.error('Wallet error:', error)
    return NextResponse.json({ error: 'Failed to process wallet transaction' }, { status: 500 })
  }
}
