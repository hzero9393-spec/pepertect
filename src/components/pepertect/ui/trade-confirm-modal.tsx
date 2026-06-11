'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Loader2,
  AlertTriangle,
  Shield,
  Wallet,
  ChevronRight,
} from 'lucide-react'
import { formatINR } from '@/lib/format'

// ─── Types ───────────────────────────────────────────────────────

export interface TradeConfirmData {
  symbol: string
  direction: 'BUY' | 'SELL'
  segment: 'EQUITY' | 'FUTURES' | 'OPTIONS'
  productType: string
  orderType: string
  quantity: number
  price: number
  totalValue: number
  brokerage: number
  marginRequired?: number
  availableBalance: number
  // Options specific
  optionType?: 'CE' | 'PE'
  strikePrice?: number
  lots?: number
  lotSize?: number
  expiryDate?: string
}

type ModalState = 'confirming' | 'executing' | 'success' | 'error'

interface TradeConfirmModalProps {
  open: boolean
  onClose: () => void
  tradeData: TradeConfirmData | null
  onConfirm: () => Promise<{ success: boolean; message?: string; error?: string; orderId?: string; balance?: number; totalValue?: number; brokerage?: number }>
  onSuccess?: () => void
}

// ─── Swipe to Confirm Component ──────────────────────────────

function SwipeToConfirm({ onConfirm, color, disabled }: { onConfirm: () => void; color: 'green' | 'red'; disabled: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(300)
  const x = useMotionValue(0)
  const [dragging, setDragging] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  // Measure container width on mount
   
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth)
    }
  }, [])

  const backgroundColor = useTransform(
    x,
    [0, 200],
    [color === 'green' ? 'rgba(0,209,156,0.15)' : 'rgba(235,91,60,0.15)', color === 'green' ? 'rgba(0,209,156,0.4)' : 'rgba(235,91,60,0.4)']
  )

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number } }) => {
    setDragging(false)
    const cw = containerRef.current?.offsetWidth ?? containerWidth
    if (info.offset.x > cw * 0.6) {
      setConfirmed(true)
      onConfirm()
    }
  }, [onConfirm, containerWidth])

  if (confirmed) {
    return (
      <div className={`h-14 rounded-2xl flex items-center justify-center ${
        color === 'green' ? 'bg-[#00D09C]' : 'bg-[#EB5B3C]'
      }`}>
        <Loader2 className="size-5 animate-spin text-white" />
        <span className="ml-2 text-sm font-bold text-white">Processing...</span>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-14 rounded-2xl overflow-hidden ${disabled ? 'opacity-50' : ''}`}
    >
      {/* Background track */}
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor }}
      />
      
      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-[#6b7280] flex items-center gap-2">
          <ChevronRight className="size-4" />
          Swipe to confirm
          <ChevronRight className="size-4" />
        </span>
      </div>

      {/* Draggable thumb */}
      <motion.div
        className={`relative z-10 h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing ${
          color === 'green' ? 'bg-[#00D09C]' : 'bg-[#EB5B3C]'
        }`}
        style={{ x }}
        drag={disabled ? false : 'x'}
        dragConstraints={{ left: 0, right: containerWidth - 56 }}
        dragElastic={0.05}
        onDragStart={() => setDragging(true)}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 1.05 }}
      >
        <ChevronRight className="size-6 text-white" />
      </motion.div>
    </div>
  )
}

// ─── Confetti Particles ───────────────────────────────────────

function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const randomX = Math.random() * 100
  const randomDuration = 1.5 + Math.random() * 1.5

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 6 + Math.random() * 6,
        height: 6 + Math.random() * 6,
        backgroundColor: color,
        left: `${randomX}%`,
        top: '30%',
      }}
      initial={{ y: 0, opacity: 1, scale: 1 }}
      animate={{
        y: [0, -80 - Math.random() * 60],
        x: [(randomX - 50) * 2, (randomX - 50) * 3],
        opacity: [1, 1, 0],
        scale: [1, 0.5],
        rotate: [0, 360],
      }}
      transition={{
        duration: randomDuration,
        delay,
        ease: 'easeOut',
      }}
    />
  )
}

function SuccessConfetti() {
  const colors = ['#00D09C', '#00B386', '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1']
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <ConfettiParticle
          key={i}
          delay={i * 0.05}
          color={colors[i % colors.length]}
        />
      ))}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────

export function TradeConfirmModal({
  open,
  onClose,
  tradeData,
  onConfirm,
  onSuccess,
}: TradeConfirmModalProps) {
  const [state, setState] = useState<ModalState>('confirming')
  const [errorMsg, setErrorMsg] = useState('')
  const [resultData, setResultData] = useState<{
    orderId?: string
    balance?: number
    totalValue?: number
    brokerage?: number
  }>({})

  const isBuy = tradeData?.direction === 'BUY'
  const sufficientBalance = tradeData
    ? tradeData.segment === 'FUTURES' || (tradeData.segment === 'OPTIONS' && tradeData.direction === 'SELL' && tradeData.marginRequired)
      ? tradeData.availableBalance >= (tradeData.marginRequired || 0)
      : tradeData.availableBalance >= (tradeData.totalValue + tradeData.brokerage)
    : false

  const handleConfirm = async () => {
    setState('executing')
    setErrorMsg('')
    try {
      const result = await onConfirm()
      if (result.success) {
        setState('success')
        setResultData({
          orderId: result.orderId,
          balance: result.balance,
          totalValue: result.totalValue,
          brokerage: result.brokerage,
        })
        onSuccess?.()
      } else {
        setState('error')
        setErrorMsg(result.error || 'Order failed. Please try again.')
      }
    } catch {
      setState('error')
      setErrorMsg('Network error. Please check your connection and try again.')
    }
  }

  const handleButtonClick = () => {
    handleConfirm()
  }

  const handleClose = () => {
    if (state === 'executing') return
    setState('confirming')
    setErrorMsg('')
    setResultData({})
    onClose()
  }

  if (!tradeData) return null

  const totalCost = tradeData.segment === 'FUTURES' || tradeData.marginRequired
    ? tradeData.marginRequired || 0
    : tradeData.totalValue + tradeData.brokerage

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal - Full screen on mobile, card on desktop */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full sm:max-w-md h-[100dvh] sm:h-auto sm:max-h-[90vh] bg-white sm:rounded-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ─── Header ─────────────────────────────────────── */}
            <div className={`relative px-5 py-4 sm:px-6 sm:py-5 shrink-0 ${
              state === 'success'
                ? isBuy ? 'bg-gradient-to-r from-[#00B386] to-[#00D09C]' : 'bg-gradient-to-r from-[#EB5B3C] to-[#F06B4E]'
                : state === 'error'
                  ? 'bg-gradient-to-r from-[#EB5B3C] to-[#F06B4E]'
                  : isBuy ? 'bg-gradient-to-r from-[#00B386]/10 to-[#00D09C]/5' : 'bg-gradient-to-r from-[#EB5B3C]/10 to-[#F06B4E]/5'
            }`}>
              {/* Drag handle on mobile */}
              <div className="flex justify-center mb-2 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-black/20" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {state === 'success' ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                      <CheckCircle2 className="size-8 text-white" />
                    </motion.div>
                  ) : state === 'error' ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                      <XCircle className="size-8 text-white" />
                    </motion.div>
                  ) : (
                    <div className={`size-10 rounded-full flex items-center justify-center ${
                      isBuy ? 'bg-[#00B386]/20' : 'bg-[#EB5B3C]/20'
                    }`}>
                      {isBuy ? (
                        <ArrowUpRight className="size-5 text-[#00B386]" />
                      ) : (
                        <ArrowDownRight className="size-5 text-[#EB5B3C]" />
                      )}
                    </div>
                  )}
                  <div>
                    {state === 'success' ? (
                      <>
                        <h3 className="text-lg font-bold text-white">Order Executed!</h3>
                        <p className="text-xs text-white/80">Your trade has been filled successfully</p>
                      </>
                    ) : state === 'error' ? (
                      <>
                        <h3 className="text-lg font-bold text-white">Order Failed</h3>
                        <p className="text-xs text-white/80">Check the reason below</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-base font-bold text-[#1a1a1a]">Confirm Order</h3>
                        <p className="text-xs text-[#6b7280]">Review your order details carefully</p>
                      </>
                    )}
                  </div>
                </div>
                {state !== 'executing' && (
                  <button
                    onClick={handleClose}
                    className={`size-8 rounded-full flex items-center justify-center transition-colors ${
                      state === 'success' || state === 'error'
                        ? 'hover:bg-white/20 text-white'
                        : 'hover:bg-[#f5f7fa] text-[#6b7280]'
                    }`}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>

            {/* ─── Body (scrollable) ────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
              {state === 'confirming' || state === 'executing' ? (
                <>
                  {/* Symbol & Direction Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-[#1a1a1a]">{tradeData.symbol}</span>
                      {tradeData.segment !== 'EQUITY' && (
                        <span className="text-[10px] font-bold bg-[#f5f7fa] text-[#6b7280] px-2 py-0.5 rounded-md">
                          {tradeData.segment}
                        </span>
                      )}
                      {tradeData.optionType && tradeData.strikePrice && (
                        <span className="text-[10px] font-bold bg-[#f5f7fa] text-[#6b7280] px-2 py-0.5 rounded-md">
                          {tradeData.strikePrice} {tradeData.optionType}
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 px-4 py-2 rounded-xl font-bold text-sm ${
                      isBuy
                        ? 'bg-[#00B386]/10 text-[#00B386]'
                        : 'bg-[#EB5B3C]/10 text-[#EB5B3C]'
                    }`}>
                      {isBuy ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                      {tradeData.direction}
                    </div>
                  </div>

                  {/* Order Details Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#f5f7fa] rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#6b7280] mb-1">Order Type</p>
                      <p className="text-sm font-bold text-[#1a1a1a]">{tradeData.orderType}</p>
                    </div>
                    <div className="bg-[#f5f7fa] rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#6b7280] mb-1">Product</p>
                      <p className="text-sm font-bold text-[#1a1a1a]">{tradeData.productType}</p>
                    </div>
                    <div className="bg-[#f5f7fa] rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#6b7280] mb-1">
                        {tradeData.lots ? 'Lots' : 'Quantity'}
                      </p>
                      <p className="text-sm font-bold font-mono font-tabular text-[#1a1a1a]">
                        {tradeData.lots ? `${tradeData.lots} (${tradeData.quantity} qty)` : tradeData.quantity}
                      </p>
                    </div>
                    <div className="bg-[#f5f7fa] rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#6b7280] mb-1">Price</p>
                      <p className="text-sm font-bold font-mono font-tabular text-[#1a1a1a]">
                        {formatINR(tradeData.price)}
                      </p>
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="border border-[#e5e7eb] rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#6b7280]">Total Value</span>
                      <span className="font-mono font-tabular font-semibold text-[#1a1a1a]">
                        {formatINR(tradeData.totalValue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#6b7280]">Brokerage</span>
                      <span className="font-mono font-tabular text-sm text-[#6b7280]">
                        {formatINR(tradeData.brokerage)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e5e7eb]">
                      <span className="text-sm font-semibold text-[#1a1a1a]">
                        {tradeData.marginRequired ? 'Margin Required' : 'Total Cost'}
                      </span>
                      <span className={`font-mono font-tabular font-bold text-lg ${
                        sufficientBalance ? 'text-[#00B386]' : 'text-[#EB5B3C]'
                      }`}>
                        {formatINR(totalCost)}
                      </span>
                    </div>
                  </div>

                  {/* Balance Check */}
                  <div className={`flex items-center justify-between p-3 rounded-xl ${
                    sufficientBalance
                      ? 'bg-[#00B386]/5 border border-[#00B386]/10'
                      : 'bg-[#EB5B3C]/5 border border-[#EB5B3C]/10'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Wallet className={`size-4 ${sufficientBalance ? 'text-[#00B386]' : 'text-[#EB5B3C]'}`} />
                      <span className="text-sm font-medium text-[#6b7280]">Available Balance</span>
                    </div>
                    <span className={`font-mono font-tabular font-bold text-sm ${
                      sufficientBalance ? 'text-[#00B386]' : 'text-[#EB5B3C]'
                    }`}>
                      {formatINR(tradeData.availableBalance)}
                    </span>
                  </div>

                  {!sufficientBalance && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-[#EB5B3C]/5 border border-[#EB5B3C]/10">
                      <AlertTriangle className="size-4 text-[#EB5B3C] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-[#EB5B3C]">Insufficient Balance</p>
                        <p className="text-[11px] text-[#6b7280] mt-0.5">
                          You need {formatINR(totalCost - tradeData.availableBalance)} more to place this order.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Risk Disclaimer - More prominent */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                    <Shield className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800">Paper Trading Simulation</p>
                      <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                        This is a virtual trading simulation with no real money. Orders are executed at the current market price.
                      </p>
                    </div>
                  </div>
                </>
              ) : state === 'success' ? (
                <>
                  <SuccessConfetti />
                  
                  {/* Success State */}
                  <div className="text-center py-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#00B386]/10 mb-4"
                    >
                      <CheckCircle2 className="size-5 text-[#00B386]" />
                      <span className="text-sm font-bold text-[#00B386]">
                        {tradeData.direction} {tradeData.quantity} {tradeData.symbol} @ {formatINR(tradeData.price)}
                      </span>
                    </motion.div>
                  </div>

                  {/* Success Details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#f5f7fa] rounded-xl p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-[#6b7280] mb-1">Order ID</p>
                      <p className="text-xs font-mono font-tabular font-bold text-[#1a1a1a]">
                        #{resultData.orderId || 'N/A'}
                      </p>
                    </div>
                    <div className="bg-[#f5f7fa] rounded-xl p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-[#6b7280] mb-1">Remaining Balance</p>
                      <p className="text-sm font-mono font-tabular font-bold text-[#00B386]">
                        {resultData.balance ? formatINR(resultData.balance) : '--'}
                      </p>
                    </div>
                    <div className="bg-[#f5f7fa] rounded-xl p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-[#6b7280] mb-1">Total Value</p>
                      <p className="text-sm font-mono font-tabular font-bold text-[#1a1a1a]">
                        {resultData.totalValue ? formatINR(resultData.totalValue) : formatINR(tradeData.totalValue)}
                      </p>
                    </div>
                    <div className="bg-[#f5f7fa] rounded-xl p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-[#6b7280] mb-1">Brokerage</p>
                      <p className="text-sm font-mono font-tabular font-bold text-[#6b7280]">
                        {resultData.brokerage ? formatINR(resultData.brokerage) : formatINR(tradeData.brokerage)}
                      </p>
                    </div>
                  </div>
                </>
              ) : state === 'error' ? (
                <>
                  {/* Error State */}
                  <div className="text-center py-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EB5B3C]/10 mb-3"
                    >
                      <XCircle className="size-5 text-[#EB5B3C]" />
                      <span className="text-sm font-bold text-[#EB5B3C]">Order Rejected</span>
                    </motion.div>
                  </div>

                  {/* Prominent Error Reason Box */}
                  <div className="bg-[#EB5B3C]/5 border border-[#EB5B3C]/20 rounded-xl p-4 mb-2">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="size-5 text-[#EB5B3C] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[#EB5B3C] mb-1">Reason</p>
                        <p className="text-sm text-[#1a1a1a] leading-relaxed">
                          {errorMsg}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Helpful suggestion based on common errors */}
                  {(errorMsg.includes('Insufficient') || errorMsg.includes('balance') || errorMsg.includes('margin')) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                      <Wallet className="size-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800">Tip</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Try reducing the quantity or switch to a different segment with lower margin requirements.
                        </p>
                      </div>
                    </div>
                  )}
                  {errorMsg.includes('No open position') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                      <Shield className="size-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800">Tip</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          You need to buy the stock first before selling. Check your Positions page to see what you hold.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* ─── Footer Actions ──────────────────────────────── */}
            <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-[#e5e7eb] bg-[#f9fafb]">
              {state === 'confirming' ? (
                <div className="space-y-3">
                  {/* Swipe to confirm on mobile */}
                  <div className="sm:hidden">
                    <SwipeToConfirm
                      onConfirm={handleConfirm}
                      color={isBuy ? 'green' : 'red'}
                      disabled={!sufficientBalance}
                    />
                  </div>
                  {/* Button confirm on desktop */}
                  <div className="hidden sm:flex gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 h-12 rounded-xl text-sm font-bold text-[#6b7280] bg-white border border-[#e5e7eb] hover:bg-[#f5f7fa] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleButtonClick}
                      disabled={!sufficientBalance}
                      className={`flex-1 h-12 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        isBuy
                          ? 'bg-[#00B386] hover:bg-[#009B73] active:scale-[0.98]'
                          : 'bg-[#EB5B3C] hover:bg-[#D44F33] active:scale-[0.98]'
                      }`}
                    >
                      {isBuy ? 'Confirm BUY' : 'Confirm SELL'}
                    </button>
                  </div>
                  {/* Cancel button on mobile */}
                  <button
                    onClick={handleClose}
                    className="sm:hidden w-full h-10 rounded-xl text-sm font-semibold text-[#6b7280] bg-white border border-[#e5e7eb] hover:bg-[#f5f7fa] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : state === 'executing' ? (
                <div className="flex items-center justify-center gap-3 h-12">
                  <Loader2 className="size-5 animate-spin text-[#00D09C]" />
                  <span className="text-sm font-semibold text-[#6b7280]">Placing your order...</span>
                </div>
              ) : state === 'success' ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 h-12 rounded-xl text-sm font-bold text-[#6b7280] bg-white border border-[#e5e7eb] hover:bg-[#f5f7fa] transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleClose()
                      onSuccess?.()
                    }}
                    className="flex-1 h-12 rounded-xl text-sm font-bold text-white bg-[#00B386] hover:bg-[#009B73] transition-all active:scale-[0.98]"
                  >
                    View Positions
                  </button>
                </div>
              ) : state === 'error' ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 h-12 rounded-xl text-sm font-bold text-[#6b7280] bg-white border border-[#e5e7eb] hover:bg-[#f5f7fa] transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => { setState('confirming'); setErrorMsg('') }}
                    className="flex-1 h-12 rounded-xl text-sm font-bold text-white bg-[#EB5B3C] hover:bg-[#D44F33] transition-all active:scale-[0.98]"
                  >
                    Try Again
                  </button>
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
