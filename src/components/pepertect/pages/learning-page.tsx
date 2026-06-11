'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  GraduationCap,
  BookOpen,
  Target,
  ShieldCheck,
  BarChart3,
  CandlestickChart,
  ArrowRight,
  Play,
  Clock,
  Star,
  FileText,
  Video,
  Lightbulb,
  ChevronRight,
  Sparkles,
  Loader2,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────
interface LearningPath {
  id: string
  title: string
  category: string
  duration: string
  difficulty: string
  description: string
  modules: number
  completed: number
  progress: number
}

// ─── Difficulty Color Map ─────────────────────────────────────────────
function getDifficultyBadge(difficulty: string) {
  switch (difficulty?.toLowerCase()) {
    case 'beginner':
      return 'bg-[#00B386]/10 text-[#00B386]'
    case 'intermediate':
      return 'bg-[#00D09C]/10 text-[#00D09C]'
    case 'advanced':
      return 'bg-[#eb5b3c]/10 text-[#eb5b3c]'
    default:
      return 'bg-[#6b7280]/10 text-[#6b7280]'
  }
}

function getDifficultyBorderColor(difficulty: string) {
  switch (difficulty?.toLowerCase()) {
    case 'beginner':
      return 'border-l-[#00B386]'
    case 'intermediate':
      return 'border-l-[#00D09C]'
    case 'advanced':
      return 'border-l-[#eb5b3c]'
    default:
      return 'border-l-[#6b7280]'
  }
}

function getDifficultyIcon(difficulty: string) {
  switch (difficulty?.toLowerCase()) {
    case 'beginner':
      return BookOpen
    case 'intermediate':
      return CandlestickChart
    case 'advanced':
      return Target
    default:
      return BookOpen
  }
}

// ─── Component ────────────────────────────────────────────────────────
export function LearningPage() {
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLearning = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/learning')
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data?.length > 0) {
          setPaths(json.data.map((item: Record<string, unknown>) => ({
            id: String(item.id || ''),
            title: String(item.title || ''),
            category: String(item.category || 'General'),
            duration: String(item.duration || 'N/A'),
            difficulty: String(item.difficulty || 'Beginner'),
            description: String(item.description || ''),
            modules: Number(item.modules || 0),
            completed: Number(item.completed || 0),
            progress: Number(item.progress || 0),
          })))
        } else {
          setPaths([])
        }
      } else {
        setPaths([])
      }
    } catch {
      setPaths([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLearning()
  }, [fetchLearning])

  // ─── Loading State ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#00D09C]/10">
            <GraduationCap className="size-5 text-[#00D09C]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1a1a] tracking-tight">Learning Hub</h1>
            <p className="text-[#6b7280] mt-0.5 text-sm">Build your trading knowledge</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-[#e5e7eb] rounded-xl p-6 space-y-3 animate-pulse">
              <div className="h-4 bg-[#f0f0f5] rounded w-2/3" />
              <div className="h-3 bg-[#f0f0f5] rounded w-full" />
              <div className="h-3 bg-[#f0f0f5] rounded w-1/2" />
              <div className="h-2 bg-[#f0f0f5] rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── Empty State ──────────────────────────────────────────────
  if (paths.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#00D09C]/10">
            <GraduationCap className="size-5 text-[#00D09C]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1a1a] tracking-tight">Learning Hub</h1>
            <p className="text-[#6b7280] mt-0.5 text-sm">Build your trading knowledge</p>
          </div>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl py-16 flex flex-col items-center justify-center">
          <div className="size-16 rounded-full bg-[#f5f7fa] flex items-center justify-center mb-4">
            <BookOpen className="size-8 text-[#6b7280]" />
          </div>
          <h3 className="text-[#1a1a1a] font-bold text-lg mb-2">Learning content not available yet</h3>
          <p className="text-[#6b7280] text-sm max-w-md text-center">
            We are curating the best trading courses, tutorials, and resources for you. Check back soon!
          </p>
        </div>
      </div>
    )
  }

  // ─── Has Data ─────────────────────────────────────────────────
  const totalModules = paths.reduce((s, p) => s + p.modules, 0)
  const completedModules = paths.reduce((s, p) => s + p.completed, 0)

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#00D09C]/10">
            <GraduationCap className="size-5 text-[#00D09C]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1a1a] tracking-tight">Learning Hub</h1>
            <p className="text-[#6b7280] mt-0.5 text-sm">Build your trading knowledge with structured courses</p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="bg-[#00D09C]/10 text-[#00D09C] border-0 text-sm font-semibold px-4 py-2 self-start sm:self-auto gap-1.5"
        >
          <BookOpen className="size-4" />
          {completedModules} of {totalModules} modules completed
        </Badge>
      </div>

      {/* Overall Progress Bar */}
      <Card className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#1a1a1a]">Overall Progress</span>
            <span className="font-mono text-sm font-bold text-[#00D09C]">
              {totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0}%
            </span>
          </div>
          <Progress
            value={totalModules > 0 ? (completedModules / totalModules) * 100 : 0}
            className="h-3 bg-[#f0f0f5]"
          />
          <p className="text-xs text-[#6b7280] mt-2">
            Complete {totalModules - completedModules} more modules to finish all paths
          </p>
        </CardContent>
      </Card>

      {/* ── Learning Paths ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 flex items-center gap-2">
          <Lightbulb className="size-5 text-[#00D09C]" />
          Learning Paths
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {paths.map((path) => {
            const Icon = getDifficultyIcon(path.difficulty)
            return (
              <Card
                key={path.id}
                className={`bg-white border border-[#e5e7eb] rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 ${getDifficultyBorderColor(path.difficulty)}`}
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`size-10 rounded-xl ${getDifficultyBadge(path.difficulty)} flex items-center justify-center`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getDifficultyBadge(path.difficulty)} text-[10px] font-bold border-0`}>
                        {path.difficulty}
                      </Badge>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#1a1a1a] mb-1">
                    {path.title}
                  </h3>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-[#6b7280] flex items-center gap-1">
                      <Clock className="size-3" />
                      {path.duration}
                    </span>
                    <span className="text-xs text-[#6b7280] flex items-center gap-1">
                      <BookOpen className="size-3" />
                      {path.modules} modules
                    </span>
                  </div>
                  <p className="text-sm text-[#6b7280] mb-4 leading-relaxed">
                    {path.description}
                  </p>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-[#6b7280]">
                        {path.completed}/{path.modules} completed
                      </span>
                      <span className="text-xs font-bold text-[#1a1a1a]">
                        {path.progress}%
                      </span>
                    </div>
                    <Progress value={path.progress} className="h-2" />
                  </div>

                  <Button
                    size="sm"
                    className="w-full gap-1.5 bg-[#00D09C] hover:bg-[#00b88a] text-white"
                  >
                    {path.progress > 0 ? 'Continue' : 'Start'}
                    <ArrowRight className="size-3.5" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
