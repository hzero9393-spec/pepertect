'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────

export type DateFilterPreset = 'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'custom'

export interface DateRange {
  from: Date
  to: Date
}

interface DateFilterProps {
  value: DateFilterPreset
  onChange: (preset: DateFilterPreset, range?: DateRange) => void
  customRange?: DateRange
  className?: string
}

// ─── Helper Functions ────────────────────────────────────────────

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function getDateRange(preset: DateFilterPreset, customRange?: DateRange): DateRange | null {
  const now = new Date()

  switch (preset) {
    case 'all':
      return null // no filter

    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }

    case 'tomorrow': {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return { from: startOfDay(tomorrow), to: endOfDay(tomorrow) }
    }

    case 'week': {
      const dayOfWeek = now.getDay()
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(now)
      monday.setDate(now.getDate() + diffToMonday)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { from: startOfDay(monday), to: endOfDay(sunday) }
    }

    case 'month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { from: startOfDay(firstDay), to: endOfDay(lastDay) }
    }

    case 'custom':
      return customRange || null

    default:
      return null
  }
}

export function isDateInRange(dateStr: string, range: DateRange | null): boolean {
  if (!range) return true
  const date = new Date(dateStr)
  return date >= range.from && date <= range.to
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

// ─── Preset Button Config ────────────────────────────────────────

const presets: { key: DateFilterPreset; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
]

// ─── Component ───────────────────────────────────────────────────

export function DateFilter({ value, onChange, customRange, className }: DateFilterProps) {
  const [calendarFrom, setCalendarFrom] = useState<Date | undefined>(customRange?.from)
  const [calendarTo, setCalendarTo] = useState<Date | undefined>(customRange?.to)
  const [customOpen, setCustomOpen] = useState(false)

  const handlePresetClick = useCallback((preset: DateFilterPreset) => {
    if (preset === 'custom') {
      setCustomOpen(true)
      return
    }
    onChange(preset)
  }, [onChange])

  const handleCustomApply = useCallback(() => {
    if (calendarFrom && calendarTo) {
      const range: DateRange = {
        from: startOfDay(calendarFrom),
        to: endOfDay(calendarTo),
      }
      onChange('custom', range)
      setCustomOpen(false)
    }
  }, [calendarFrom, calendarTo, onChange])

  const handleCustomClear = useCallback(() => {
    setCalendarFrom(undefined)
    setCalendarTo(undefined)
    setCustomOpen(false)
    onChange('all')
  }, [onChange])

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {presets.map((preset) => (
        <Button
          key={preset.key}
          variant="ghost"
          size="sm"
          onClick={() => handlePresetClick(preset.key)}
          className={cn(
            'h-8 px-3.5 text-xs font-semibold rounded-lg border transition-all',
            value === preset.key
              ? 'bg-[#00D09C] text-white border-[#00D09C] shadow-sm hover:bg-[#00b88a] hover:text-white hover:border-[#00b88a]'
              : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:bg-[#f5f7fa] hover:text-[#1a1a1a] hover:border-[#d1d5db]'
          )}
        >
          {preset.label}
        </Button>
      ))}

      {/* Custom Date Picker */}
      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 px-3.5 text-xs font-semibold rounded-lg border transition-all gap-1.5',
              value === 'custom'
                ? 'bg-[#00D09C] text-white border-[#00D09C] shadow-sm hover:bg-[#00b88a] hover:text-white hover:border-[#00b88a]'
                : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:bg-[#f5f7fa] hover:text-[#1a1a1a] hover:border-[#d1d5db]'
            )}
          >
            <CalendarIcon className="size-3.5" />
            Custom
            <ChevronDown className="size-3 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white border border-[#e5e7eb] rounded-xl shadow-lg" align="start">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarIcon className="size-4 text-[#00D09C]" />
              <span className="text-sm font-semibold text-[#1a1a1a]">Select Date Range</span>
            </div>

            <Calendar
              mode="range"
              selected={{ from: calendarFrom, to: calendarTo }}
              onSelect={(range) => {
                setCalendarFrom(range?.from)
                setCalendarTo(range?.to)
              }}
              numberOfMonths={1}
              defaultMonth={new Date()}
              className="rounded-lg border border-[#e5e7eb]"
            />

            {/* Selected Range Display */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 bg-[#f8f9fb] rounded-lg px-3 py-2 border border-[#e5e7eb]/50">
                <p className="text-[10px] font-semibold uppercase text-[#6b7280] tracking-wider">From</p>
                <p className="text-xs font-semibold text-[#1a1a1a] mt-0.5">
                  {calendarFrom ? formatShortDate(calendarFrom) : 'Select'}
                </p>
              </div>
              <div className="text-[#6b7280] text-xs">→</div>
              <div className="flex-1 bg-[#f8f9fb] rounded-lg px-3 py-2 border border-[#e5e7eb]/50">
                <p className="text-[10px] font-semibold uppercase text-[#6b7280] tracking-wider">To</p>
                <p className="text-xs font-semibold text-[#1a1a1a] mt-0.5">
                  {calendarTo ? formatShortDate(calendarTo) : 'Select'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCustomClear}
                className="h-8 flex-1 text-xs font-semibold rounded-lg border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f5f7fa]"
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleCustomApply}
                disabled={!calendarFrom || !calendarTo}
                className="h-8 flex-1 text-xs font-semibold rounded-lg bg-[#00D09C] hover:bg-[#00b88a] text-white disabled:opacity-40"
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Custom Range Indicator */}
      {value === 'custom' && customRange && (
        <span className="text-[10px] text-[#6b7280] bg-[#f8f9fb] px-2.5 py-1 rounded-md border border-[#e5e7eb]/50">
          {formatShortDate(customRange.from)} → {formatShortDate(customRange.to)}
        </span>
      )}
    </div>
  )
}
