import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get current IST time
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000 // IST is UTC+5:30
    const istNow = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60000)

    const hours = istNow.getHours()
    const minutes = istNow.getMinutes()
    const day = istNow.getDay() // 0 = Sunday, 6 = Saturday
    const timeInMinutes = hours * 60 + minutes

    // Check if today is a holiday
    const todayStr = istNow.toISOString().split('T')[0]
    const holiday = await db.marketHoliday.findFirst({
      where: { date: new Date(todayStr) },
    })

    let status: 'OPEN' | 'CLOSED' | 'PRE-OPEN' | 'POST-CLOSE'
    let message: string
    let nextOpen: string | null = null

    // Weekend check
    if (day === 0 || day === 6) {
      status = 'CLOSED'
      message = day === 0 ? 'Market closed - Sunday' : 'Market closed - Saturday'
      // Next open is Monday at 9:15 AM IST
      const daysUntilMonday = day === 0 ? 1 : 2
      const nextMonday = new Date(istNow)
      nextMonday.setDate(istNow.getDate() + daysUntilMonday)
      nextOpen = `${nextMonday.toISOString().split('T')[0]}T09:15:00+05:30`
    }
    // Holiday check (including Muhurat)
    else if (holiday) {
      if (holiday.isMuhurat && holiday.muhuratStart && holiday.muhuratEnd) {
        // Check if within Muhurat trading window
        const [startH, startM] = holiday.muhuratStart.split(':').map(Number)
        const [endH, endM] = holiday.muhuratEnd.split(':').map(Number)
        const muhuratStartMin = startH * 60 + startM
        const muhuratEndMin = endH * 60 + endM

        if (timeInMinutes >= muhuratStartMin && timeInMinutes <= muhuratEndMin) {
          status = 'OPEN'
          message = `Muhurat Trading Session (${holiday.muhuratStart} - ${holiday.muhuratEnd})`
        } else if (timeInMinutes < muhuratStartMin) {
          status = 'PRE-OPEN'
          message = `Muhurat Trading opens at ${holiday.muhuratStart} IST - ${holiday.name}`
        } else {
          status = 'CLOSED'
          message = `Market closed - ${holiday.name} (Muhurat session ended)`
        }
      } else {
        status = 'CLOSED'
        message = `Market closed - ${holiday.name}`
      }
    }
    // Normal trading day
    else {
      // Pre-open: 9:00 - 9:15 IST
      if (timeInMinutes >= 540 && timeInMinutes < 555) {
        status = 'PRE-OPEN'
        message = 'Pre-open session (9:00 - 9:15 IST)'
      }
      // Normal trading: 9:15 - 15:30 IST
      else if (timeInMinutes >= 555 && timeInMinutes < 930) {
        status = 'OPEN'
        message = 'Market is open (9:15 - 15:30 IST)'
      }
      // Post-close: 15:30 - 16:00 IST
      else if (timeInMinutes >= 930 && timeInMinutes < 960) {
        status = 'POST-CLOSE'
        message = 'Post-close session (15:30 - 16:00 IST)'
      }
      // Before market hours
      else if (timeInMinutes < 540) {
        status = 'CLOSED'
        message = 'Market opens at 9:00 IST (Pre-open session)'
      }
      // After market hours
      else {
        status = 'CLOSED'
        message = 'Market closed for the day'
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status,
        message,
        istTime: istNow.toISOString(),
        nextOpen,
      },
    })
  } catch (error) {
    console.error('[API /market/status] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get market status' },
      { status: 500 }
    )
  }
}
