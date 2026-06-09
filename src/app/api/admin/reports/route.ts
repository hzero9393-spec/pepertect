import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/trade-auth'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// ─── Color Constants ────────────────────────────────────────────────
const C = {
  white: rgb(1, 1, 1),
  lightGray: rgb(0.92, 0.92, 0.94),
  midGray: rgb(0.55, 0.55, 0.6),
  darkGray: rgb(0.3, 0.3, 0.35),
  darkBg: rgb(0.1, 0.1, 0.13),
  headerBg: rgb(0.06, 0.06, 0.09),
  green: rgb(0, 0.816, 0.612),
  red: rgb(0.918, 0.357, 0.235),
  accentLine: rgb(0, 0.816, 0.612),
  sectionBg: rgb(0.96, 0.97, 0.98),
  tableHeaderBg: rgb(0.06, 0.06, 0.09),
  tableRowEven: rgb(0.96, 0.96, 0.97),
  tableRowOdd: rgb(1, 1, 1),
  warningBg: rgb(1, 0.95, 0.9),
  warningText: rgb(0.8, 0.35, 0.1),
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '₹0.00'
  const sign = value >= 0 ? '' : '-'
  return `${sign}₹${Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateStr(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTimeStr(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

// ─── Draw Footer ────────────────────────────────────────────────────
function drawFooter(page: ReturnType<PDFDocument['addPage']>, font: ReturnType<PDFDocument['embedFont']>, pageWidth: number, pageHeight: number) {
  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: 45, color: C.headerBg })
  page.drawRectangle({ x: 0, y: 45, width: pageWidth, height: 2, color: C.accentLine })
  page.drawText('This is a paper trading report for educational purposes only. Not financial advice.', {
    x: 50, y: 27, size: 7, font, color: C.midGray,
  })
  const ts = `Generated: ${new Date().toISOString()}`
  const tw = font.widthOfTextAtSize(ts, 7)
  page.drawText(ts, { x: pageWidth - 50 - tw, y: 27, size: 7, font, color: C.midGray })
  page.drawText('Pepertect Admin Report', { x: 50, y: 14, size: 7, font, color: C.accentLine })
}

// ─── Draw Header ────────────────────────────────────────────────────
function drawHeader(pdfDoc: PDFDocument, title: string, subtitle: string, fontBold: ReturnType<PDFDocument['embedFont']>, fontRegular: ReturnType<PDFDocument['embedFont']>) {
  const pageWidth = 595.28
  const pageHeight = 841.89
  const page = pdfDoc.addPage([pageWidth, pageHeight])

  // Dark header bar
  page.drawRectangle({ x: 0, y: pageHeight - 90, width: pageWidth, height: 90, color: C.headerBg })
  page.drawRectangle({ x: 0, y: pageHeight - 93, width: pageWidth, height: 3, color: C.accentLine })

  page.drawText('Pepertect', { x: 50, y: pageHeight - 35, size: 22, font: fontBold, color: C.accentLine })
  const tpWidth = fontBold.widthOfTextAtSize('Pepertect', 22)
  page.drawText('Admin Report', { x: 50 + tpWidth + 10, y: pageHeight - 35, size: 16, font: fontRegular, color: C.midGray })

  page.drawText(title, { x: 50, y: pageHeight - 58, size: 11, font: fontRegular, color: C.midGray })

  const dateStr = formatDateStr(new Date())
  const dateWidth = fontRegular.widthOfTextAtSize(dateStr, 11)
  page.drawText(dateStr, { x: pageWidth - 50 - dateWidth, y: pageHeight - 58, size: 11, font: fontRegular, color: C.midGray })

  return { page, y: pageHeight - 115 }
}

// ─── GET Handler ────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error
    const userId = auth.userId

    // Verify admin role
    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type')

    if (!reportType || !['users', 'trades', 'revenue'].includes(reportType)) {
      return NextResponse.json({ error: 'Invalid report type. Must be "users", "trades", or "revenue".' }, { status: 400 })
    }

    if (reportType === 'users') return await generateUsersReport()
    if (reportType === 'trades') return await generateTradesReport()
    return await generateRevenueReport()
  } catch (error) {
    console.error('[Admin Report API] Error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

// ─── Users Report ───────────────────────────────────────────────────
async function generateUsersReport(): Promise<NextResponse> {
  const users = await db.user.findMany({
    select: {
      id: true, name: true, email: true, phone: true,
      virtualBalance: true, marginUsed: true, totalTrades: true,
      winRate: true, totalPnl: true, subscription: true,
      isActive: true, isEmailVerified: true, lastLoginAt: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const pdfDoc = await PDFDocument.create()
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const pageWidth = 595.28
  const pageHeight = 841.89
  const contentWidth = pageWidth - 100

  let { page, y } = drawHeader(pdfDoc, 'Users Report — All User Data', `${users.length} users`, fontBold, fontRegular)

  const ensureSpace = (needed: number) => {
    if (y - needed < 60) {
      drawFooter(page, fontRegular, pageWidth, pageHeight)
      const result = drawHeader(pdfDoc, 'Users Report (continued)', `${users.length} users`, fontBold, fontRegular)
      page = result.page
      y = result.y
    }
  }

  // Summary section
  ensureSpace(80)
  const totalBalance = users.reduce((s, u) => s + u.virtualBalance, 0)
  const totalPnlSum = users.reduce((s, u) => s + u.totalPnl, 0)
  const premiumCount = users.filter(u => u.subscription === 'PREMIUM').length
  const activeCount = users.filter(u => u.isActive).length

  page.drawRectangle({ x: 40, y: y - 55, width: contentWidth + 20, height: 65, color: C.sectionBg, borderRadius: 6 })
  page.drawText('Summary', { x: 50, y: y - 5, size: 12, font: fontBold, color: C.darkBg })
  y -= 22
  page.drawText(`Total Users: ${users.length}`, { x: 55, y, size: 10, font: fontRegular, color: C.darkBg })
  page.drawText(`Active: ${activeCount}`, { x: 200, y, size: 10, font: fontRegular, color: C.green })
  page.drawText(`Premium: ${premiumCount}`, { x: 300, y, size: 10, font: fontRegular, color: C.accentLine })
  page.drawText(`Total Balance: ${formatCurrency(totalBalance)}`, { x: 400, y, size: 10, font: fontBold, color: C.darkBg })
  y -= 16
  page.drawText(`Total P&L: ${formatCurrency(totalPnlSum)}`, { x: 55, y, size: 10, font: fontBold, color: totalPnlSum >= 0 ? C.green : C.red })
  y -= 35

  // Table headers
  const cols = [
    { label: 'Name', width: 90 },
    { label: 'Email', width: 130 },
    { label: 'Balance', width: 70 },
    { label: 'Trades', width: 45 },
    { label: 'P&L', width: 70 },
    { label: 'Win%', width: 40 },
    { label: 'Plan', width: 50 },
    { label: 'Status', width: 50 },
  ]

  ensureSpace(25)
  page.drawRectangle({ x: 40, y: y - 4, width: contentWidth + 20, height: 20, color: C.tableHeaderBg, borderRadius: 4 })
  let colX = 48
  for (const col of cols) {
    page.drawText(col.label, { x: colX, y: y + 2, size: 8, font: fontBold, color: C.white })
    colX += col.width
  }
  y -= 24

  // Table rows
  for (let i = 0; i < users.length; i++) {
    ensureSpace(22)
    const u = users[i]
    const rowBg = i % 2 === 0 ? C.tableRowEven : C.tableRowOdd
    page.drawRectangle({ x: 40, y: y - 4, width: contentWidth + 20, height: 18, color: rowBg })

    const pnlColor = u.totalPnl >= 0 ? C.green : C.red

    const truncate = (text: string, maxLen: number) => text.length > maxLen ? text.substring(0, maxLen - 1) + '…' : text

    const rowData = [
      { text: truncate(u.name || '—', 14), width: 90, color: C.darkBg },
      { text: truncate(u.email, 20), width: 130, color: C.darkBg },
      { text: formatCurrency(u.virtualBalance).replace('₹', '₹'), width: 70, color: C.darkBg },
      { text: String(u.totalTrades), width: 45, color: C.darkBg },
      { text: formatCurrency(u.totalPnl), width: 70, color: pnlColor },
      { text: `${u.winRate.toFixed(1)}%`, width: 40, color: u.winRate >= 50 ? C.green : C.red },
      { text: u.subscription, width: 50, color: C.darkBg },
      { text: u.isActive ? 'Active' : 'Inactive', width: 50, color: u.isActive ? C.green : C.red },
    ]

    colX = 48
    for (let j = 0; j < rowData.length; j++) {
      let text = rowData[j].text
      const maxW = cols[j].width - 4
      while (fontRegular.widthOfTextAtSize(text, 7.5) > maxW && text.length > 3) text = text.slice(0, -1)
      page.drawText(text, { x: colX, y: y + 1, size: 7.5, font: fontRegular, color: rowData[j].color })
      colX += cols[j].width
    }
    y -= 20
  }

  drawFooter(page, fontRegular, pageWidth, pageHeight)

  const pdfBytes = await pdfDoc.save()
  return new NextResponse(pdfBytes, {
    status: 200,
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="users-report.pdf"' },
  })
}

// ─── Trades Report ──────────────────────────────────────────────────
async function generateTradesReport(): Promise<NextResponse> {
  const trades = await db.trade.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { executedAt: 'desc' },
    take: 500,
  })

  const pdfDoc = await PDFDocument.create()
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const pageWidth = 595.28
  const pageHeight = 841.89
  const contentWidth = pageWidth - 100

  let { page, y } = drawHeader(pdfDoc, 'Trades Report — Complete Trade History', `${trades.length} trades (max 500)`, fontBold, fontRegular)

  const ensureSpace = (needed: number) => {
    if (y - needed < 60) {
      drawFooter(page, fontRegular, pageWidth, pageHeight)
      const result = drawHeader(pdfDoc, 'Trades Report (continued)', `${trades.length} trades`, fontBold, fontRegular)
      page = result.page
      y = result.y
    }
  }

  // Summary
  ensureSpace(80)
  const totalPnlSum = trades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const buyTrades = trades.filter(t => t.tradeDirection === 'BUY').length
  const sellTrades = trades.filter(t => t.tradeDirection === 'SELL').length
  const optionsTrades = trades.filter(t => t.segment === 'OPTIONS').length

  page.drawRectangle({ x: 40, y: y - 55, width: contentWidth + 20, height: 65, color: C.sectionBg, borderRadius: 6 })
  page.drawText('Summary', { x: 50, y: y - 5, size: 12, font: fontBold, color: C.darkBg })
  y -= 22
  page.drawText(`Total Trades: ${trades.length}`, { x: 55, y, size: 10, font: fontRegular, color: C.darkBg })
  page.drawText(`Buys: ${buyTrades}`, { x: 190, y, size: 10, font: fontRegular, color: C.green })
  page.drawText(`Sells: ${sellTrades}`, { x: 270, y, size: 10, font: fontRegular, color: C.red })
  page.drawText(`Options: ${optionsTrades}`, { x: 350, y, size: 10, font: fontRegular, color: C.accentLine })
  y -= 16
  page.drawText(`Total P&L: ${formatCurrency(totalPnlSum)}`, { x: 55, y, size: 10, font: fontBold, color: totalPnlSum >= 0 ? C.green : C.red })
  y -= 35

  // Table
  const cols = [
    { label: 'User', width: 70 },
    { label: 'Symbol', width: 65 },
    { label: 'Type', width: 32 },
    { label: 'Direction', width: 45 },
    { label: 'Qty', width: 30 },
    { label: 'Price', width: 50 },
    { label: 'Value', width: 60 },
    { label: 'P&L', width: 65 },
    { label: 'Time', width: 78 },
  ]

  ensureSpace(25)
  page.drawRectangle({ x: 40, y: y - 4, width: contentWidth + 20, height: 20, color: C.tableHeaderBg, borderRadius: 4 })
  let colX = 48
  for (const col of cols) {
    page.drawText(col.label, { x: colX, y: y + 2, size: 8, font: fontBold, color: C.white })
    colX += col.width
  }
  y -= 24

  for (let i = 0; i < trades.length; i++) {
    ensureSpace(22)
    const t = trades[i]
    const rowBg = i % 2 === 0 ? C.tableRowEven : C.tableRowOdd
    page.drawRectangle({ x: 40, y: y - 4, width: contentWidth + 20, height: 18, color: rowBg })

    const isBuy = t.tradeDirection === 'BUY'
    const pnlValue = t.pnl ?? 0
    const pnlColor = pnlValue >= 0 ? C.green : C.red

    let symbolDisplay = t.symbol
    if (t.optionType && t.strikePrice) symbolDisplay = `${t.symbol} ${t.strikePrice}${t.optionType}`
    if (symbolDisplay.length > 11) symbolDisplay = symbolDisplay.substring(0, 10) + '…'

    const truncate = (text: string, maxLen: number) => text.length > maxLen ? text.substring(0, maxLen - 1) + '…' : text

    const timeStr = formatDateTimeStr(t.executedAt)
    const rowData = [
      { text: truncate(t.user.name || '—', 11), width: 70, color: C.darkBg },
      { text: symbolDisplay, width: 65, color: C.darkBg },
      { text: t.segment === 'OPTIONS' ? 'OPT' : t.segment === 'FUTURES' ? 'FUT' : 'EQ', width: 32, color: C.midGray },
      { text: isBuy ? 'BUY' : 'SELL', width: 45, color: isBuy ? C.green : C.red },
      { text: String(t.quantity), width: 30, color: C.darkBg },
      { text: `₹${t.fillPrice.toFixed(2)}`, width: 50, color: C.darkBg },
      { text: formatCurrency(t.totalValue), width: 60, color: C.darkBg },
      { text: formatCurrency(pnlValue), width: 65, color: pnlColor },
      { text: timeStr.length > 14 ? timeStr.substring(0, 14) : timeStr, width: 78, color: C.midGray },
    ]

    colX = 48
    for (let j = 0; j < rowData.length; j++) {
      let text = rowData[j].text
      const maxW = cols[j].width - 4
      while (fontRegular.widthOfTextAtSize(text, 7.5) > maxW && text.length > 3) text = text.slice(0, -1)
      page.drawText(text, { x: colX, y: y + 1, size: 7.5, font: fontRegular, color: rowData[j].color })
      colX += cols[j].width
    }
    y -= 20
  }

  drawFooter(page, fontRegular, pageWidth, pageHeight)

  const pdfBytes = await pdfDoc.save()
  return new NextResponse(pdfBytes, {
    status: 200,
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="trades-report.pdf"' },
  })
}

// ─── Revenue Report ─────────────────────────────────────────────────
async function generateRevenueReport(): Promise<NextResponse> {
  const users = await db.user.findMany({
    select: {
      id: true, name: true, email: true, subscription: true,
      virtualBalance: true, totalTrades: true, totalPnl: true,
      createdAt: true, isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const premiumUsers = users.filter(u => u.subscription === 'PREMIUM')
  const freeUsers = users.filter(u => u.subscription === 'FREE')
  const monthlyRevenue = premiumUsers.length * 99
  const totalTrades = users.reduce((s, u) => s + u.totalTrades, 0)
  const totalPnlSum = users.reduce((s, u) => s + u.totalPnl, 0)
  const totalBalance = users.reduce((s, u) => s + u.virtualBalance, 0)

  const pdfDoc = await PDFDocument.create()
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const pageWidth = 595.28
  const pageHeight = 841.89
  const contentWidth = pageWidth - 100

  let { page, y } = drawHeader(pdfDoc, 'Revenue Report — Subscription & Revenue Data', `As of ${formatDateStr(new Date())}`, fontBold, fontRegular)

  const ensureSpace = (needed: number) => {
    if (y - needed < 60) {
      drawFooter(page, fontRegular, pageWidth, pageHeight)
      const result = drawHeader(pdfDoc, 'Revenue Report (continued)', '', fontBold, fontRegular)
      page = result.page
      y = result.y
    }
  }

  // Revenue Cards
  ensureSpace(120)
  const cards = [
    { label: 'Total Users', value: String(users.length), color: C.darkBg },
    { label: 'Premium Users', value: String(premiumUsers.length), color: C.accentLine },
    { label: 'Monthly Revenue', value: `₹${monthlyRevenue.toLocaleString('en-IN')}`, color: C.green },
    { label: 'Annual Revenue', value: `₹${(monthlyRevenue * 12).toLocaleString('en-IN')}`, color: C.green },
    { label: 'Conversion Rate', value: `${users.length > 0 ? ((premiumUsers.length / users.length) * 100).toFixed(1) : 0}%`, color: C.accentLine },
  ]

  const cardWidth = (contentWidth - 40) / cards.length
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    const cardX = 50 + i * (cardWidth + 10)
    page.drawRectangle({ x: cardX, y: y - 45, width: cardWidth, height: 50, color: C.sectionBg, borderRadius: 6 })
    page.drawRectangle({ x: cardX, y: y + 2, width: cardWidth, height: 3, color: card.color, borderRadius: 1 })
    page.drawText(card.label, { x: cardX + 8, y: y - 8, size: 8, font: fontRegular, color: C.midGray })
    let valueText = card.value
    while (fontBold.widthOfTextAtSize(valueText, 11) > cardWidth - 16 && valueText.length > 3) valueText = valueText.slice(0, -1)
    page.drawText(valueText, { x: cardX + 8, y: y - 28, size: 11, font: fontBold, color: card.color })
  }
  y -= 65

  // Subscription Breakdown
  ensureSpace(100)
  page.drawText('Subscription Breakdown', { x: 50, y, size: 14, font: fontBold, color: C.darkBg })
  y -= 25

  const breakdownData = [
    { label: 'Free Users', count: freeUsers.length, pct: users.length > 0 ? ((freeUsers.length / users.length) * 100).toFixed(1) : '0' },
    { label: 'Premium Users', count: premiumUsers.length, pct: users.length > 0 ? ((premiumUsers.length / users.length) * 100).toFixed(1) : '0' },
  ]

  for (const item of breakdownData) {
    ensureSpace(40)
    page.drawRectangle({ x: 40, y: y - 25, width: contentWidth + 20, height: 30, color: C.sectionBg, borderRadius: 4 })
    page.drawText(item.label, { x: 55, y: y - 8, size: 11, font: fontBold, color: C.darkBg })
    page.drawText(`${item.count} users (${item.pct}%)`, { x: 200, y: y - 8, size: 10, font: fontRegular, color: C.midGray })
    // Progress bar
    const barWidth = 150
    const fillWidth = (barWidth * parseFloat(item.pct)) / 100
    page.drawRectangle({ x: 380, y: y - 12, width: barWidth, height: 10, color: C.lightGray, borderRadius: 3 })
    if (fillWidth > 0) {
      page.drawRectangle({ x: 380, y: y - 12, width: fillWidth, height: 10, color: item.label.includes('Premium') ? C.accentLine : C.midGray, borderRadius: 3 })
    }
    y -= 35
  }

  y -= 10

  // Premium Revenue Projection
  ensureSpace(60)
  page.drawText('Revenue Projection', { x: 50, y, size: 14, font: fontBold, color: C.darkBg })
  y -= 22

  const projections = [
    { label: 'Price per Premium subscription', value: '₹99/month' },
    { label: 'Current Premium users', value: String(premiumUsers.length) },
    { label: 'Monthly Recurring Revenue (MRR)', value: `₹${monthlyRevenue.toLocaleString('en-IN')}` },
    { label: 'Annual Recurring Revenue (ARR)', value: `₹${(monthlyRevenue * 12).toLocaleString('en-IN')}` },
    { label: 'If 50% convert to Premium', value: `₹${Math.round(users.length * 0.5 * 99).toLocaleString('en-IN')}/month` },
  ]

  for (const p of projections) {
    ensureSpace(20)
    page.drawText(p.label, { x: 55, y, size: 10, font: fontRegular, color: C.midGray })
    const valWidth = fontBold.widthOfTextAtSize(p.value, 10)
    page.drawText(p.value, { x: pageWidth - 50 - valWidth, y, size: 10, font: fontBold, color: C.darkBg })
    y -= 18
  }

  y -= 15

  // Premium Users Table
  if (premiumUsers.length > 0) {
    ensureSpace(50)
    page.drawText('Premium Users', { x: 50, y, size: 14, font: fontBold, color: C.darkBg })
    y -= 10

    const pCols = [
      { label: 'Name', width: 120 },
      { label: 'Email', width: 170 },
      { label: 'Trades', width: 50 },
      { label: 'P&L', width: 75 },
      { label: 'Since', width: 75 },
    ]

    ensureSpace(25)
    page.drawRectangle({ x: 40, y: y - 4, width: contentWidth + 20, height: 20, color: C.tableHeaderBg, borderRadius: 4 })
    let colX = 48
    for (const col of pCols) {
      page.drawText(col.label, { x: colX, y: y + 2, size: 8, font: fontBold, color: C.white })
      colX += col.width
    }
    y -= 24

    for (let i = 0; i < premiumUsers.length; i++) {
      ensureSpace(22)
      const u = premiumUsers[i]
      const rowBg = i % 2 === 0 ? C.tableRowEven : C.tableRowOdd
      page.drawRectangle({ x: 40, y: y - 4, width: contentWidth + 20, height: 18, color: rowBg })

      const truncate = (text: string, maxLen: number) => text.length > maxLen ? text.substring(0, maxLen - 1) + '…' : text

      const rowData = [
        { text: truncate(u.name || '—', 18), width: 120, color: C.darkBg },
        { text: truncate(u.email, 25), width: 170, color: C.midGray },
        { text: String(u.totalTrades), width: 50, color: C.darkBg },
        { text: formatCurrency(u.totalPnl), width: 75, color: u.totalPnl >= 0 ? C.green : C.red },
        { text: formatDateStr(u.createdAt), width: 75, color: C.midGray },
      ]

      colX = 48
      for (let j = 0; j < rowData.length; j++) {
        let text = rowData[j].text
        const maxW = pCols[j].width - 4
        while (fontRegular.widthOfTextAtSize(text, 7.5) > maxW && text.length > 3) text = text.slice(0, -1)
        page.drawText(text, { x: colX, y: y + 1, size: 7.5, font: fontRegular, color: rowData[j].color })
        colX += pCols[j].width
      }
      y -= 20
    }
  }

  drawFooter(page, fontRegular, pageWidth, pageHeight)

  const pdfBytes = await pdfDoc.save()
  return new NextResponse(pdfBytes, {
    status: 200,
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="revenue-report.pdf"' },
  })
}
