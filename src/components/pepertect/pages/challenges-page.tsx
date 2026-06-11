'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Trophy,
  Target,
  Users,
  Clock,
  Zap,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Flame,
  CalendarClock,
  Medal,
} from 'lucide-react'

const activeChallenges = [
  {
    id: 1,
    title: '30-Day Profit Sprint',
    description: 'Achieve a +15% portfolio return within 30 days using any strategy.',
    target: '+15% return',
    prize: '₹500 credit',
    participants: 234,
    progress: 68,
    endDate: 'Mar 28, 2026',
    icon: Flame,
    accentBg: 'bg-amber-500/10',
    accentText: 'text-amber-500',
    joined: true,
  },
  {
    id: 2,
    title: 'Risk Manager Pro',
    description: 'Maintain a maximum drawdown of 2% while executing at least 20 trades.',
    target: 'Max 2% drawdown',
    prize: 'Premium access',
    participants: 156,
    progress: 45,
    endDate: 'Apr 10, 2026',
    icon: ShieldCheck,
    accentBg: 'bg-emerald-500/10',
    accentText: 'text-emerald-400',
    joined: false,
  },
  {
    id: 3,
    title: 'Volume Master',
    description: 'Complete 50 trades with a positive P&L ratio to claim the reward.',
    target: '50 trades',
    prize: '₹200 cash',
    participants: 412,
    progress: 82,
    endDate: 'Mar 20, 2026',
    icon: BarChart3,
    accentBg: 'bg-red-500/10',
    accentText: 'text-red-400',
    joined: true,
  },
]

const myActiveChallenges = [
  { id: 1, title: '30-Day Profit Sprint', progress: 68, daysLeft: 12, accentColor: '#f59e0b' },
  { id: 2, title: 'Volume Master', progress: 82, daysLeft: 4, accentColor: '#ef4444' },
]

const upcomingChallenges = [
  { id: 1, title: 'Swing Trading Showdown', description: 'Master swing trading strategies over 14 days with minimum 10 positions.', startsIn: 5, prize: '₹300 credit', participants: 89, icon: Zap },
  { id: 2, title: 'Options Strategy Challenge', description: 'Navigate options premium decay and achieve consistent returns.', startsIn: 12, prize: '₹150 cash', participants: 64, icon: Target },
]

const completedChallenges = [
  { name: 'Quick Scalp Challenge', result: 'Won' as const, reward: '₹100 credit', date: 'Feb 28, 2026' },
  { name: 'Steady Growth Marathon', result: 'Won' as const, reward: 'Premium 1-month', date: 'Feb 15, 2026' },
  { name: 'Forex Precision Trial', result: 'Lost' as const, reward: '—', date: 'Jan 30, 2026' },
  { name: 'Dividend Hunter Quest', result: 'Won' as const, reward: '₹75 cash', date: 'Jan 12, 2026' },
]

function ProgressRing({ progress, size = 80, strokeWidth = 6, color = '#f59e0b' }: { progress: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1f2937" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700 ease-out" />
    </svg>
  )
}

export function ChallengesPage() {
  const [joinedMap, setJoinedMap] = useState<Record<number, boolean>>({ 1: true, 2: false, 3: true })

  const handleJoin = (id: number) => {
    setJoinedMap((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Trading Challenges</h1>
          <p className="text-gray-400 mt-1 text-sm">Compete, learn, and earn rewards</p>
        </div>
        <Badge variant="secondary" className="gap-1.5 bg-amber-500/10 text-amber-500 border-0 text-sm font-semibold px-4 py-2 self-start sm:self-auto">
          <Medal className="size-4" />
          Your Rank: #42
        </Badge>
      </div>

      {/* Active Challenges */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Flame className="size-5 text-red-400" />
          Active Challenges
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {activeChallenges.map((challenge) => {
            const Icon = challenge.icon
            const isJoined = joinedMap[challenge.id]
            return (
              <Card key={challenge.id} className="bg-[#111827] border border-[#1f2937] rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: challenge.accentText.includes('amber') ? '#f59e0b' : challenge.accentText.includes('emerald') ? '#10b981' : '#ef4444' }}>
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`size-10 rounded-xl ${challenge.accentBg} flex items-center justify-center`}>
                      <Icon className={`size-5 ${challenge.accentText}`} />
                    </div>
                    <Badge variant="secondary" className="bg-[#1f2937] text-gray-400 border-0 text-xs">
                      <Users className="size-3 mr-1" />
                      {challenge.participants}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{challenge.title}</h3>
                  <p className="text-sm text-gray-400 mb-4 leading-relaxed">{challenge.description}</p>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="size-4 text-gray-400" />
                      <span className="text-gray-400">Target:</span>
                      <span className="font-semibold text-white">{challenge.target}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="size-4 text-gray-400" />
                      <span className="text-gray-400">Prize:</span>
                      <span className="font-semibold text-white">{challenge.prize}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="size-4 text-gray-400" />
                      <span className="text-gray-400">Ends:</span>
                      <span className="text-white">{challenge.endDate}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-gray-400">Progress</span>
                      <span className="text-xs font-bold text-white">{challenge.progress}%</span>
                    </div>
                    <Progress value={challenge.progress} className="h-2" />
                  </div>

                  <div className="flex gap-2">
                    {isJoined ? (
                      <Button size="sm" className="flex-1 gap-1.5 spring-interaction bg-amber-500 hover:bg-amber-400 text-black">
                        View Details
                        <ArrowRight className="size-3.5" />
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleJoin(challenge.id)} className="flex-1 gap-1.5 spring-interaction bg-amber-500 hover:bg-amber-400 text-black">
                        Join Challenge
                        <ArrowRight className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* My Active Challenges */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="size-5 text-amber-500" />
          My Active Challenges
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {myActiveChallenges.map((challenge) => (
            <Card key={challenge.id} className="bg-[#111827] border border-[#1f2937] rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-5">
                  <div className="relative shrink-0">
                    <ProgressRing progress={challenge.progress} size={80} strokeWidth={6} color={challenge.accentColor} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-mono text-sm font-bold text-white">{challenge.progress}%</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm mb-1 truncate">{challenge.title}</h3>
                    <p className="text-xs text-gray-400 mb-2">{challenge.daysLeft} days remaining</p>
                    <Button variant="outline" size="sm" className="gap-1.5 text-amber-500 border-amber-500/30 hover:bg-amber-500/10 spring-interaction text-xs">
                      Continue
                      <ArrowRight className="size-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Upcoming Challenges */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CalendarClock className="size-5 text-gray-400" />
          Upcoming Challenges
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {upcomingChallenges.map((challenge) => {
            const Icon = challenge.icon
            return (
              <Card key={challenge.id} className="bg-[#111827] border border-[#1f2937] rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="size-10 rounded-xl bg-[#1f2937] flex items-center justify-center">
                      <Icon className="size-5 text-gray-400" />
                    </div>
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-0 text-xs font-semibold gap-1">
                      <Clock className="size-3" />
                      Starts in {challenge.startsIn} days
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-white mb-1">{challenge.title}</h3>
                  <p className="text-sm text-gray-400 mb-3 leading-relaxed">{challenge.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Trophy className="size-3" />{challenge.prize}</span>
                      <span className="flex items-center gap-1"><Users className="size-3" />{challenge.participants} interested</span>
                    </div>
                    <Button variant="outline" size="sm" className="spring-interaction text-xs h-8 border-[#1f2937] text-gray-400 hover:text-amber-500 hover:border-amber-500/30">
                      Notify Me
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Completed Challenges */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy className="size-5 text-emerald-400" />
          Completed Challenges
        </h2>
        <Card className="bg-[#111827] border border-[#1f2937] rounded-xl shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-[#1f2937]">
                    <TableHead className="text-gray-400 font-semibold text-xs uppercase tracking-wider">Challenge Name</TableHead>
                    <TableHead className="text-gray-400 font-semibold text-xs uppercase tracking-wider">Result</TableHead>
                    <TableHead className="text-gray-400 font-semibold text-xs uppercase tracking-wider">Reward</TableHead>
                    <TableHead className="text-gray-400 font-semibold text-xs uppercase tracking-wider text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedChallenges.map((challenge, index) => (
                    <TableRow key={index} className="border-[#1f2937] hover:bg-[#1a2332]/50">
                      <TableCell className="font-semibold text-white">{challenge.name}</TableCell>
                      <TableCell>
                        {challenge.result === 'Won' ? (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-0 text-xs font-semibold gap-1">
                            <CheckCircle2 className="size-3" />Won
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-0 text-xs font-semibold gap-1">
                            <XCircle className="size-3" />Lost
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-white">{challenge.reward}</TableCell>
                      <TableCell className="text-gray-400 text-right text-xs">{challenge.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
