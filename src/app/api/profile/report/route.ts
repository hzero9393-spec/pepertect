import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/trade-auth'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// ─── Color Constants ────────────────────────────────────────────────
const COLORS = {
  darkBg: rgb(0.11, 0.11, 0.14),          // #1C1C24
  headerBg: rgb(0.08, 0.08, 0.11),         // #141419
  white: rgb(1, 1, 1),
  lightGray: rgb(0.92, 0.92, 0.94),
  midGray: rgb(0.55, 0.55, 0.6),
  darkGray: rgb(0.3, 0.3, 0.35),
  green: rgb(0, 0.816, 0.612),             // #00D09C
  red: rgb(0.918, 0.357, 0.235),           // #eb5b3c
  tableHeaderBg: rgb(0.06, 0.06, 0.09),
  tableRowEven: rgb(0.96, 0.96, 0.97),
  tableRowOdd: rgb(1, 1, 1),
  accentLine: rgb(0, 0.816, 0.612),        // #00D09C
  sectionBg: rgb(0.96, 0.97, 0.98),
  warningBg: rgb(1, 0.95, 0.9),
  warningText: rgb(0.8, 0.35, 0.1),
}

// ─── Helper: Format currency (using Rs. instead of ₹ for Helvetica compatibility) ────
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Rs.0.00'
  const sign = value >= 0 ? '' : '-'
  const abs = Math.abs(value)
  return `${sign}Rs.${abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Helper: Format percent ─────────────────────────────────────────
function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0.00%'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

// ─── Helper: Format date ────────────────────────────────────────────
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

// ─── Helper: Draw wrapped text ──────────────────────────────────────
function drawWrappedText(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  font: ReturnType<PDFDocument['embedFont']>,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  color: ReturnType<typeof rgb> = COLORS.darkBg,
): number {
  const words = text.split(' ')
  let line = ''
  let currentY = y

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    const testWidth = font.widthOfTextAtSize(testLine, fontSize)
    if (testWidth > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size: fontSize, font, color })
      currentY -= fontSize + 4
      line = word
    } else {
      line = testLine
    }
  }
  if (line) {
    page.drawText(line, { x, y: currentY, size: fontSize, font, color })
    currentY -= fontSize + 4
  }

  return currentY
}

// ─── Helper: Draw a section divider ─────────────────────────────────
function drawDivider(page: ReturnType<PDFDocument['addPage']>, y: number, width: number) {
  page.drawLine({
    start: { x: 50, y },
    end: { x: 50 + width, y },
    thickness: 0.5,
    color: COLORS.darkGray,
  })
}

// ─── GET Handler (query param ?type=last|monthly|full) ──────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error
    const userId = auth.userId

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type')

    if (!reportType || !['last', 'monthly', 'full'].includes(reportType)) {
      return NextResponse.json(
        { error: 'Invalid report type. Must be "last", "monthly", or "full".' },
        { status: 400 }
      )
    }

    return await generateReport(userId, reportType)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[GET /api/profile/report] Error:', message, error)
    return NextResponse.json(
      { error: `Failed to generate report: ${message}` },
      { status: 500 }
    )
  }
}

// ─── POST Handler (body { type: 'last'|'monthly'|'full' }) ──────────
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error
    const userId = auth.userId

    let body: { type?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const reportType = body.type
    if (!reportType || !['last', 'monthly', 'full'].includes(reportType)) {
      return NextResponse.json(
        { error: 'Invalid report type. Must be "last", "monthly", or "full".' },
        { status: 400 }
      )
    }

    return await generateReport(userId, reportType)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[POST /api/profile/report] Error:', message, error)
    return NextResponse.json(
      { error: `Failed to generate report: ${message}` },
      { status: 500 }
    )
  }
}

// ─── Shared Report Generation Logic ─────────────────────────────────
async function generateReport(userId: string, reportType: string): Promise<NextResponse> {
  // Fetch user data
  let user
  try {
    user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        virtualBalance: true,
        totalTrades: true,
        winRate: true,
        totalPnl: true,
        subscription: true,
        createdAt: true,
      },
    })
  } catch (dbError) {
    const message = dbError instanceof Error ? dbError.message : 'Unknown database error'
    console.error('[generateReport] Failed to fetch user:', message)
    return NextResponse.json(
      { error: `Failed to fetch user data: ${message}` },
      { status: 500 }
    )
  }

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Fetch trades based on type
  const now = new Date()
  let tradesWhere: Record<string, unknown> = { userId }

  if (reportType === 'last') {
    let lastTrade
    try {
      lastTrade = await db.trade.findFirst({
        where: { userId },
        orderBy: { executedAt: 'desc' },
      })
    } catch (dbError) {
      const message = dbError instanceof Error ? dbError.message : 'Unknown database error'
      console.error('[generateReport] Failed to fetch last trade:', message)
      return NextResponse.json(
        { error: `Failed to fetch trade data: ${message}` },
        { status: 500 }
      )
    }
    const trades = lastTrade ? [lastTrade] : []
    return await generatePDF(user, trades, reportType)
  }

  if (reportType === 'monthly') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    tradesWhere = { userId, executedAt: { gte: thirtyDaysAgo } }
  }

  let trades
  try {
    trades = await db.trade.findMany({
      where: tradesWhere,
      orderBy: { executedAt: 'desc' },
    })
  } catch (dbError) {
    const message = dbError instanceof Error ? dbError.message : 'Unknown database error'
    console.error('[generateReport] Failed to fetch trades:', message)
    return NextResponse.json(
      { error: `Failed to fetch trade data: ${message}` },
      { status: 500 }
    )
  }

  return await generatePDF(user, trades, reportType)
}

// ─── PDF Generation ─────────────────────────────────────────────────
async function generatePDF(
  user: {
    id: string
    name: string
    email: string
    virtualBalance: number
    totalTrades: number
    winRate: number
    totalPnl: number
    subscription: string
    createdAt: Date
  },
  trades: Array<{
    id: string
    userId: string
    segment: string
    productType?: string | null
    tradeDirection: string
    symbol: string
    optionType: string | null
    strikePrice: number | null
    expiryDate: Date | null
    quantity: number
    fillPrice: number
    totalValue: number
    brokerage: number
    pnl: number | null
    pnlPercent: number | null
    executedAt: Date
    squaredOffAt: Date | null
  }>,
  reportType: string,
): Promise<NextResponse> {
  let pdfDoc: PDFDocument
  try {
    pdfDoc = await PDFDocument.create()
  } catch (pdfError) {
    const message = pdfError instanceof Error ? pdfError.message : 'Unknown PDF creation error'
    console.error('[generatePDF] Failed to create PDF document:', message)
    return NextResponse.json(
      { error: `Failed to create PDF document: ${message}` },
      { status: 500 }
    )
  }
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const pageWidth = 595.28 // A4
  const pageHeight = 841.89
  const contentWidth = pageWidth - 100 // 50px margins each side
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - 50

  // ─── Helper: Check if we need a new page ─────────────────────────
  const ensureSpace = (needed: number) => {
    if (y - needed < 60) {
      // Draw footer on current page before switching
      drawFooter(currentPage, fontRegular, pageWidth, pageHeight)
      currentPage = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - 50
    }
  }

  // ─── HEADER SECTION ──────────────────────────────────────────────
  // Dark background bar
  currentPage.drawRectangle({
    x: 0,
    y: pageHeight - 90,
    width: pageWidth,
    height: 90,
    color: COLORS.headerBg,
  })

  // Accent line
  currentPage.drawRectangle({
    x: 0,
    y: pageHeight - 93,
    width: pageWidth,
    height: 3,
    color: COLORS.accentLine,
  })

  // App name
  currentPage.drawText('Pepertect', {
    x: 50,
    y: pageHeight - 35,
    size: 22,
    font: fontBold,
    color: COLORS.accentLine,
  })

  currentPage.drawText('Paper Trading Report', {
    x: 50 + fontBold.widthOfTextAtSize('Pepertect', 22) + 10,
    y: pageHeight - 35,
    size: 16,
    font: fontRegular,
    color: COLORS.midGray,
  })

  // Report type label
  const reportTypeLabel = {
    last: 'Last Trade Report',
    monthly: 'Monthly Report',
    full: 'Full Trading Report',
  }[reportType]

  currentPage.drawText(reportTypeLabel, {
    x: 50,
    y: pageHeight - 58,
    size: 11,
    font: fontRegular,
    color: COLORS.midGray,
  })

  // Date on right
  const dateStr = formatDate(new Date())
  const dateWidth = fontRegular.widthOfTextAtSize(dateStr, 11)
  currentPage.drawText(dateStr, {
    x: pageWidth - 50 - dateWidth,
    y: pageHeight - 58,
    size: 11,
    font: fontRegular,
    color: COLORS.midGray,
  })

  y = pageHeight - 115

  // ─── USER INFO SECTION ───────────────────────────────────────────
  ensureSpace(70)
  currentPage.drawRectangle({
    x: 40,
    y: y - 55,
    width: contentWidth + 20,
    height: 65,
    color: COLORS.sectionBg,
    borderRadius: 6,
  })

  currentPage.drawText('User Information', {
    x: 50,
    y: y - 5,
    size: 12,
    font: fontBold,
    color: COLORS.darkBg,
  })

  y -= 22
  currentPage.drawText(`Name: ${user.name}`, { x: 55, y, size: 10, font: fontRegular, color: COLORS.darkBg })
  currentPage.drawText(`User ID: ${user.id}`, { x: 320, y, size: 9, font: fontRegular, color: COLORS.midGray })
  y -= 16
  currentPage.drawText(`Email: ${user.email}`, { x: 55, y, size: 10, font: fontRegular, color: COLORS.darkBg })
  currentPage.drawText(`Plan: ${user.subscription}`, { x: 320, y, size: 10, font: fontRegular, color: COLORS.darkBg })
  y -= 16
  currentPage.drawText(`Account Balance: ${formatCurrency(user.virtualBalance)}`, { x: 55, y, size: 9, font: fontBold, color: COLORS.darkBg })
  currentPage.drawText(`Member since: ${formatDate(user.createdAt)}`, { x: 320, y, size: 10, font: fontRegular, color: COLORS.midGray })

  y -= 35

  // ─── TRADE DETAILS TABLE ─────────────────────────────────────────
  ensureSpace(60)
  currentPage.drawText('Trade Details', {
    x: 50,
    y,
    size: 14,
    font: fontBold,
    color: COLORS.darkBg,
  })

  const tradeCountLabel = `${trades.length} trade${trades.length !== 1 ? 's' : ''}`
  const tradeCountWidth = fontRegular.widthOfTextAtSize(tradeCountLabel, 10)
  currentPage.drawText(tradeCountLabel, {
    x: 50 + fontBold.widthOfTextAtSize('Trade Details', 14) + 12,
    y: y + 2,
    size: 10,
    font: fontRegular,
    color: COLORS.midGray,
  })

  y -= 10

  if (trades.length === 0) {
    ensureSpace(40)
    y -= 20
    currentPage.drawText('No trades found for this report period.', {
      x: 50,
      y,
      size: 11,
      font: fontRegular,
      color: COLORS.midGray,
    })
    y -= 30
  } else {
    // Table headers
    const tableColumns = [
      { label: 'Symbol', width: 70 },
      { label: 'Type', width: 38 },
      { label: 'Entry Time', width: 82 },
      { label: 'Exit Time', width: 82 },
      { label: 'Qty', width: 32 },
      { label: 'Entry', width: 58 },
      { label: 'Exit', width: 58 },
      { label: 'Capital', width: 62 },
      { label: 'P&L', width: 75 },
    ]

    y -= 25
    ensureSpace(20)

    // Table header row
    currentPage.drawRectangle({
      x: 40,
      y: y - 4,
      width: contentWidth + 20,
      height: 20,
      color: COLORS.tableHeaderBg,
      borderRadius: 4,
    })

    let colX = 48
    for (const col of tableColumns) {
      currentPage.drawText(col.label, {
        x: colX,
        y: y + 2,
        size: 8,
        font: fontBold,
        color: COLORS.white,
      })
      colX += col.width
    }
    y -= 24

    // Table rows
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i]
      ensureSpace(22)

      // Alternating row background
      const rowBg = i % 2 === 0 ? COLORS.tableRowEven : COLORS.tableRowOdd
      currentPage.drawRectangle({
        x: 40,
        y: y - 4,
        width: contentWidth + 20,
        height: 18,
        color: rowBg,
      })

      const isBuy = trade.tradeDirection === 'BUY'
      const pnlValue = trade.pnl ?? 0
      const pnlColor = pnlValue >= 0 ? COLORS.green : COLORS.red

      // Build symbol display (include option details if applicable)
      let symbolDisplay = trade.symbol
      if (trade.optionType && trade.strikePrice) {
        symbolDisplay = `${trade.symbol} ${trade.strikePrice}${trade.optionType}`
      }

      // Truncate long symbols
      const maxSymbolLen = 12
      if (symbolDisplay.length > maxSymbolLen) {
        symbolDisplay = symbolDisplay.substring(0, maxSymbolLen - 1) + '…'
      }

      const entryTime = formatDateTime(trade.executedAt)
      const exitTime = trade.squaredOffAt ? formatDateTime(trade.squaredOffAt) : 'Open'

      // Calculate exit price from totalValue and fillPrice
      const exitPrice = trade.squaredOffAt && trade.pnl !== null
        ? trade.fillPrice + (pnlValue / trade.quantity)
        : trade.fillPrice

      const rowValues = [
        { text: symbolDisplay, width: 70 },
        { text: isBuy ? 'BUY' : 'SELL', width: 38 },
        { text: entryTime.length > 14 ? entryTime.substring(0, 14) : entryTime, width: 82 },
        { text: exitTime.length > 14 ? exitTime.substring(0, 14) : exitTime, width: 82 },
        { text: String(trade.quantity), width: 32 },
        { text: `Rs.${trade.fillPrice.toFixed(2)}`, width: 58 },
        { text: `Rs.${exitPrice.toFixed(2)}`, width: 58 },
        { text: formatCurrency(trade.totalValue), width: 62 },
        { text: `${formatCurrency(pnlValue)} (${formatPercent(trade.pnlPercent)})`, width: 75 },
      ]

      colX = 48
      for (let j = 0; j < rowValues.length; j++) {
        let textColor = COLORS.darkBg
        if (j === 1) textColor = isBuy ? COLORS.green : COLORS.red
        if (j === 8) textColor = pnlColor

        // Truncate text if needed
        let text = rowValues[j].text
        const maxTextWidth = rowValues[j].width - 4
        while (fontRegular.widthOfTextAtSize(text, 7.5) > maxTextWidth && text.length > 3) {
          text = text.slice(0, -1)
        }

        currentPage.drawText(text, {
          x: colX,
          y: y + 1,
          size: 7.5,
          font: fontRegular,
          color: textColor,
        })
        colX += rowValues[j].width
      }
      y -= 20
    }
    y -= 15
  }

  // ─── PERFORMANCE SUMMARY ─────────────────────────────────────────
  ensureSpace(120)
  drawDivider(currentPage, y, contentWidth)
  y -= 20

  currentPage.drawText('Performance Summary', {
    x: 50,
    y,
    size: 14,
    font: fontBold,
    color: COLORS.darkBg,
  })
  y -= 25

  // Calculate stats
  const closedTrades = trades.filter((t) => t.pnl !== null)
  const totalPnlSum = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const winningTrades = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length
  const calculatedWinRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0
  const bestTrade = closedTrades.length > 0
    ? closedTrades.reduce((best, t) => ((t.pnl ?? 0) > (best.pnl ?? 0) ? t : best))
    : null
  const worstTrade = closedTrades.length > 0
    ? closedTrades.reduce((worst, t) => ((t.pnl ?? 0) < (worst.pnl ?? 0) ? t : worst))
    : null

  // Summary cards
  const totalBrokerage = trades.reduce((sum, t) => sum + (t.brokerage || 0), 0)
  const summaryItems = [
    { label: 'Total Trades', value: String(trades.length), color: COLORS.darkBg },
    { label: 'Win Rate', value: `${calculatedWinRate.toFixed(1)}%`, color: calculatedWinRate >= 50 ? COLORS.green : COLORS.red },
    { label: 'Net P&L', value: formatCurrency(totalPnlSum), color: totalPnlSum >= 0 ? COLORS.green : COLORS.red },
    { label: 'Total Brokerage', value: formatCurrency(totalBrokerage), color: COLORS.darkBg },
    { label: 'Best Trade', value: bestTrade ? formatCurrency(bestTrade.pnl) : 'N/A', color: bestTrade && bestTrade.pnl! >= 0 ? COLORS.green : COLORS.red },
  ]

  const cardWidth = (contentWidth - 40) / summaryItems.length
  for (let i = 0; i < summaryItems.length; i++) {
    const item = summaryItems[i]
    const cardX = 50 + i * (cardWidth + 10)

    currentPage.drawRectangle({
      x: cardX,
      y: y - 45,
      width: cardWidth,
      height: 50,
      color: COLORS.sectionBg,
      borderRadius: 6,
    })

    // Accent top line
    currentPage.drawRectangle({
      x: cardX,
      y: y + 2,
      width: cardWidth,
      height: 3,
      color: item.color,
      borderRadius: 1,
    })

    currentPage.drawText(item.label, {
      x: cardX + 8,
      y: y - 8,
      size: 8,
      font: fontRegular,
      color: COLORS.midGray,
    })

    // Truncate value if needed
    let valueText = item.value
    while (fontBold.widthOfTextAtSize(valueText, 12) > cardWidth - 16 && valueText.length > 3) {
      valueText = valueText.slice(0, -1)
    }

    currentPage.drawText(valueText, {
      x: cardX + 8,
      y: y - 28,
      size: 12,
      font: fontBold,
      color: item.color,
    })
  }

  y -= 65

  // ─── AI ANALYSIS SECTION ─────────────────────────────────────────
  ensureSpace(130)
  drawDivider(currentPage, y, contentWidth)
  y -= 20

  currentPage.drawText('AI Analysis', {
    x: 50,
    y,
    size: 14,
    font: fontBold,
    color: COLORS.darkBg,
  })
  y -= 25

  // Analyze trades
  const issues: string[] = []
  const suggestions: string[] = []

  // Check for no stop-loss (trades without squaredOffAt)
  const openTrades = trades.filter((t) => !t.squaredOffAt)
  if (openTrades.length > 0) {
    issues.push(`No stop-loss detected: ${openTrades.length} trade${openTrades.length > 1 ? 's' : ''} without exit records.`)
    suggestions.push('Consider using stop-loss to limit losses.')
  }

  // Check for overtrading (more than 20 trades in a single day)
  const tradesByDay: Record<string, number> = {}
  for (const trade of trades) {
    const dayKey = trade.executedAt.toISOString().split('T')[0]
    tradesByDay[dayKey] = (tradesByDay[dayKey] || 0) + 1
  }
  const overtradingDays = Object.entries(tradesByDay).filter(([, count]) => count > 20)
  if (overtradingDays.length > 0) {
    issues.push(`Overtrading detected: ${overtradingDays.length} day${overtradingDays.length > 1 ? 's' : ''} with more than 20 trades.`)
    suggestions.push('Avoid overtrading - quality over quantity.')
  }

  // Additional analysis
  if (calculatedWinRate < 40 && closedTrades.length >= 5) {
    issues.push(`Low win rate: ${calculatedWinRate.toFixed(1)}% across ${closedTrades.length} closed trades.`)
    suggestions.push('Review your trading strategy and focus on higher-probability setups.')
  }

  if (totalPnlSum < 0 && closedTrades.length >= 3) {
    issues.push(`Net losses of ${formatCurrency(totalPnlSum)} detected.`)
    suggestions.push('Consider reducing position sizes and improving risk management.')
  }

  // Positive feedback
  if (calculatedWinRate >= 60 && closedTrades.length >= 5) {
    suggestions.push('Good win rate! Keep maintaining your discipline and strategy.')
  }

  if (issues.length === 0 && trades.length > 0) {
    issues.push('No significant issues detected in the current trade set.')
  }

  if (trades.length === 0) {
    issues.push('No trades to analyze. Start paper trading to get AI insights.')
  }

  // Draw issues
  if (issues.length > 0) {
    currentPage.drawRectangle({
      x: 40,
      y: y - issues.length * 20 - 10,
      width: contentWidth + 20,
      height: issues.length * 20 + 20,
      color: COLORS.warningBg,
      borderRadius: 6,
    })

    let issueY = y
    for (const issue of issues) {
      currentPage.drawText('!', { x: 55, y: issueY, size: 10, font: fontBold, color: COLORS.warningText })
      let issueText = `  ${issue}`
      while (fontRegular.widthOfTextAtSize(issueText, 9) > contentWidth - 10 && issueText.length > 5) {
        issueText = issueText.slice(0, -1)
      }
      currentPage.drawText(issueText, { x: 68, y: issueY, size: 9, font: fontRegular, color: COLORS.warningText })
      issueY -= 20
    }
    y = issueY - 10
  }

  // Draw suggestions
  if (suggestions.length > 0) {
    ensureSpace(suggestions.length * 18 + 25)

    currentPage.drawText('Suggestions:', {
      x: 50,
      y,
      size: 10,
      font: fontBold,
      color: COLORS.darkBg,
    })
    y -= 16

    for (const suggestion of suggestions) {
      ensureSpace(18)
      currentPage.drawText('•', { x: 55, y, size: 10, font: fontRegular, color: COLORS.accentLine })
      y = drawWrappedText(currentPage, suggestion, fontRegular, 65, y, contentWidth - 20, 9, COLORS.darkBg)
      y -= 4
    }
    y -= 6
  }

  // ─── FOOTER ──────────────────────────────────────────────────────
  drawFooter(currentPage, fontRegular, pageWidth, pageHeight)

  // ─── Return PDF ──────────────────────────────────────────────────
  let pdfBytes: Uint8Array
  try {
    pdfBytes = await pdfDoc.save()
  } catch (saveError) {
    const message = saveError instanceof Error ? saveError.message : 'Unknown PDF save error'
    console.error('[generatePDF] Failed to save PDF:', message)
    return NextResponse.json(
      { error: `Failed to save PDF document: ${message}` },
      { status: 500 }
    )
  }

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="pepertect-report.pdf"',
    },
  })
}

// ─── Draw Footer ────────────────────────────────────────────────────
function drawFooter(
  page: ReturnType<PDFDocument['addPage']>,
  font: ReturnType<PDFDocument['embedFont']>,
  pageWidth: number,
  pageHeight: number,
) {
  // Footer background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: 50,
    color: COLORS.headerBg,
  })

  // Accent line
  page.drawRectangle({
    x: 0,
    y: 50,
    width: pageWidth,
    height: 2,
    color: COLORS.accentLine,
  })

  // Disclaimer
  const disclaimer = 'This is a paper trading report for educational purposes only. No real money was involved. This is not financial advice.'
  page.drawText(disclaimer, {
    x: 50,
    y: 30,
    size: 7,
    font,
    color: COLORS.midGray,
  })

  // Generated timestamp
  const timestamp = `Generated: ${new Date().toISOString()}`
  const tsWidth = font.widthOfTextAtSize(timestamp, 7)
  page.drawText(timestamp, {
    x: pageWidth - 50 - tsWidth,
    y: 30,
    size: 7,
    font,
    color: COLORS.midGray,
  })

  // Pepertect branding
  page.drawText('Pepertect Paper Trading', {
    x: 50,
    y: 16,
    size: 7,
    font,
    color: COLORS.accentLine,
  })
}
