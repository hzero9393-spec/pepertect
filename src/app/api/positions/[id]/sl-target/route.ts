import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import {
  createNotification,
  notifyStopLossHit,
  notifyTargetAchieved,
  notifySLTargetUpdated,
} from '@/lib/notifications';

/**
 * PUT /api/positions/[id]/sl-target
 * Update Stop Loss & Target for a position
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const { stopLoss, target } = body;

    // Find the position
    const position = await db.position.findFirst({
      where: { id, userId: auth.userId, status: 'OPEN' },
    });

    if (!position) {
      return NextResponse.json(
        { success: false, error: 'Position not found or already closed' },
        { status: 404 }
      );
    }

    const avgPrice = Number(position.avgPrice);

    // Validate Stop Loss
    if (stopLoss !== undefined && stopLoss !== null) {
      const sl = Number(stopLoss);
      if (sl <= 0) {
        return NextResponse.json(
          { success: false, error: 'Stop Loss must be greater than 0' },
          { status: 400 }
        );
      }
      // STRICT VALIDATION: For LONG positions, SL must be below avg price
      if (position.side === 'LONG' && sl >= avgPrice) {
        return NextResponse.json(
          { success: false, error: `Stop Loss (₹${sl.toFixed(2)}) must be below average price (₹${avgPrice.toFixed(2)}) for LONG position` },
          { status: 400 }
        );
      }
      // For SHORT positions, SL must be above avg price
      if (position.side === 'SHORT' && sl <= avgPrice) {
        return NextResponse.json(
          { success: false, error: `Stop Loss (₹${sl.toFixed(2)}) must be above average price (₹${avgPrice.toFixed(2)}) for SHORT position` },
          { status: 400 }
        );
      }
    }

    // Validate Target
    if (target !== undefined && target !== null) {
      const tgt = Number(target);
      if (tgt <= 0) {
        return NextResponse.json(
          { success: false, error: 'Target must be greater than 0' },
          { status: 400 }
        );
      }
      // STRICT VALIDATION: For LONG positions, Target must be above avg price
      if (position.side === 'LONG' && tgt <= avgPrice) {
        return NextResponse.json(
          { success: false, error: `Target (₹${tgt.toFixed(2)}) must be above average price (₹${avgPrice.toFixed(2)}) for LONG position` },
          { status: 400 }
        );
      }
      // For SHORT positions, Target must be below avg price
      if (position.side === 'SHORT' && tgt >= avgPrice) {
        return NextResponse.json(
          { success: false, error: `Target (₹${tgt.toFixed(2)}) must be below average price (₹${avgPrice.toFixed(2)}) for SHORT position` },
          { status: 400 }
        );
      }
    }

    // Update the position
    const updated = await db.position.update({
      where: { id },
      data: {
        ...(stopLoss !== undefined ? { stopLoss: stopLoss ?? null } : {}),
        ...(target !== undefined ? { target: target ?? null } : {}),
      },
    });

    // Send notification about update
    await notifySLTargetUpdated(auth.userId, position.symbol, 
      stopLoss ? Number(stopLoss) : null, 
      target ? Number(target) : null, 
      id
    );

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        stopLoss: updated.stopLoss ? Number(updated.stopLoss) : null,
        target: updated.target ? Number(updated.target) : null,
      },
      message: 'Stop Loss & Target updated successfully'
    });
  } catch (error) {
    console.error('Update SL/Target error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update Stop Loss / Target' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/positions/[id]/sl-target/check
 * Check if SL or Target is hit based on current price
 * Called by WebSocket service when live price updates
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const { currentPrice } = body;

    if (!currentPrice || currentPrice <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid current price required' },
        { status: 400 }
      );
    }

    // Find open position
    const position = await db.position.findFirst({
      where: { id, userId: auth.userId, status: 'OPEN' },
    });

    if (!position) {
      return NextResponse.json(
        { success: false, error: 'Position not found or already closed' },
        { status: 404 }
      );
    }

    const sl = position.stopLoss ? Number(position.stopLoss) : null;
    const tgt = position.target ? Number(position.target) : null;
    const price = Number(currentPrice);
    const qty = position.quantity;
    const avgPrice = Number(position.avgPrice);

    let exitReason: string | null = null;
    let exitPrice: number | null = null;

    // Check Stop Loss hit first (priority over target)
    if (sl) {
      if (position.side === 'LONG' && price <= sl) {
        exitReason = 'SL_HIT';
        exitPrice = sl; // Execute at SL price
      } else if (position.side === 'SHORT' && price >= sl) {
        exitReason = 'SL_HIT';
        exitPrice = sl;
      }
    }

    // Check Target hit (only if SL didn't trigger)
    if (!exitReason && tgt) {
      if (position.side === 'LONG' && price >= tgt) {
        exitReason = 'TARGET_HIT';
        exitPrice = tgt; // Execute at Target price
      } else if (position.side === 'SHORT' && price <= tgt) {
        exitReason = 'TARGET_HIT';
        exitPrice = tgt;
      }
    }

    // If trigger hit - auto square-off the position
    if (exitReason && exitPrice) {
      const pnl = (exitPrice - avgPrice) * qty * (position.side === 'LONG' ? 1 : -1);
      const orderValue = exitPrice * qty;

      // Update position as squared off
      await db.position.update({
        where: { id },
        data: {
          status: 'SQUAREDOFF',
          exitPrice,
          exitReason,
          closedAt: new Date(),
          pnl,
          currentPrice: exitPrice,
        },
      });

      // Update portfolio - release margin + book P&L
      await db.portfolio.update({
        where: { userId: auth.userId },
        data: {
          totalBalance: { increment: orderValue },
          availableMargin: { increment: orderValue },
          investedAmount: { decrement: Number(position.investedAmt) },
          totalPnl: { increment: pnl },
          realizedPnl: { increment: pnl },
        },
      });

      // Create trade record for the square-off
      await db.trade.create({
        data: {
          userId: auth.userId,
          stockId: position.stockId,
          positionId: id,
          symbol: position.symbol,
          side: 'SELL',
          quantity: qty,
          price: exitPrice,
          segment: position.segment,
          optionType: position.optionType,
          strikePrice: position.strikePrice,
          expiry: position.expiry,
          pnl,
          type: 'CLOSE',
        },
      });

      // Send appropriate notification
      if (exitReason === 'SL_HIT') {
        await notifyStopLossHit(auth.userId, position.symbol, exitPrice, pnl, id);
      } else {
        await notifyTargetAchieved(auth.userId, position.symbol, exitPrice, pnl, id);
      }

      return NextResponse.json({
        success: true,
        triggered: true,
        reason: exitReason,
        exitPrice,
        pnl: parseFloat(pnl.toFixed(2)),
        message: exitReason === 'SL_HIT'
          ? `⚠️ Stop Loss hit at ₹${exitPrice.toFixed(2)}. Position auto-squared off.`
          : `🎯 Target achieved at ₹${exitPrice.toFixed(2)}. Position auto-squared off!`
      });
    }

    // No trigger - position remains open
    return NextResponse.json({
      success: true,
      triggered: false,
      message: 'No trigger - position remains open',
      currentPrice: price,
      sl,
      target: tgt,
    });
  } catch (error) {
    console.error('Check SL/Target error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check Stop Loss / Target' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/positions/[id]/sl-target
 * Remove Stop Loss and/or Target from a position
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const url = new URL(req.url);
    const field = url.searchParams.get('field'); // 'stopLoss', 'target', or 'all'

    const position = await db.position.findFirst({
      where: { id, userId: auth.userId, status: 'OPEN' },
    });

    if (!position) {
      return NextResponse.json(
        { success: false, error: 'Position not found or already closed' },
        { status: 404 }
      );
    }

    let updateData: Record<string, unknown> = {};
    
    if (field === 'stopLoss') {
      updateData = { stopLoss: null };
    } else if (field === 'target') {
      updateData = { target: null };
    } else {
      // Default: remove both
      updateData = { stopLoss: null, target: null };
    }

    const updated = await db.position.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        stopLoss: updated.stopLoss ? Number(updated.stopLoss) : null,
        target: updated.target ? Number(updated.target) : null,
      },
      message: `${field === 'all' ? 'Stop Loss & Target' : field} removed`
    });
  } catch (error) {
    console.error('Remove SL/Target error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove Stop Loss / Target' },
      { status: 500 }
    );
  }
}
