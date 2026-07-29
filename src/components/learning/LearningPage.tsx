'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Play, CheckCircle, Lock, Trophy, Flame, Zap, ChevronRight,
  Coins, Star, Target, Clock, BookOpen, Brain, Crown, Shield, Loader2,
  X, ChevronDown, RotateCcw, Gift, TrendingUp, Medal, Award, Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn, formatNumber } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// ── Types ────────────────────────────────────────────────────
interface ModuleInfo {
  id: string;
  title: string;
  description?: string;
  videoUrl?: string;
  duration?: number;
  xpReward: number;
  order: number;
  status: string;
  score?: number | null;
  completedAt?: string | null;
}

interface ChallengeInfo {
  id: string;
  title: string;
  type: string;
  questions: Array<{
    type: string;
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }>;
  passingScore: number;
  xpReward: number;
  coinReward: number;
}

interface LearningPathInfo {
  id: string;
  title: string;
  description?: string;
  level: string;
  category?: string;
  icon?: string;
  order: number;
  isPremium: boolean;
  totalXP: number;
  modules: ModuleInfo[];
  totalModules: number;
  completedModules: number;
  progress: number;
}

interface GamificationInfo {
  xp: number;
  level: number;
  coins: number;
  streak: number;
  longestStreak: number;
  streakFreeze: number;
  lessonsCompleted: number;
  quizzesPassed: number;
  perfectQuizzes: number;
  badgesEarned: number;
  lastActivity?: string | null;
}

interface QuizResult {
  correct: number;
  total: number;
  scorePct: number;
  passed: boolean;
  perfect: boolean;
  xpEarned: number;
  coinsEarned: number;
  newLevel?: number;
  newBadges?: string[];
}

interface DailyChallengeData {
  alreadyAttempted: boolean;
  topic?: string;
  questions?: Array<{ type: string; question: string; options: string[]; correct: number; explanation: string }>;
  score?: number;
  correct?: number;
  total?: number;
  xpEarned?: number;
  coinsEarned?: number;
}

interface WordOfDayData {
  word: string;
  meaning: string;
  example?: string;
  category?: string;
  date: string;
}

interface BadgeInfo {
  id: string;
  name: string;
  description?: string;
  icon: string;
  category: string;
  earnedAt: string;
}

// ── XP Level Labels ───────────────────────────────────────────
const LEVEL_LABELS: Record<number, { name: string; icon: string; color: string }> = {
  1: { name: 'Rookie Trader', icon: '🥉', color: 'text-amber-600' },
  2: { name: 'Beginner', icon: '🥈', color: 'text-gray-500' },
  3: { name: 'Intermediate', icon: '🥇', color: 'text-yellow-500' },
  4: { name: 'Advanced', icon: '💎', color: 'text-blue-500' },
  5: { name: 'Pro Trader', icon: '👑', color: 'text-purple-500' },
  6: { name: 'Expert', icon: '🚀', color: 'text-red-500' },
};

// ── Main Component ───────────────────────────────────────────
export function LearningPage() {
  const { token } = useAuthStore();
  const [paths, setPaths] = useState<LearningPathInfo[]>([]);
  const [gam, setGam] = useState<GamificationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'paths' | 'daily' | 'word' | 'leaderboard' | 'profile'>('paths');

  // Expanded path
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  // Lesson view
  const [activeModule, setActiveModule] = useState<ModuleInfo | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeInfo | null>(null);
  const [activePathId, setActivePathId] = useState<string | null>(null);

  // Quiz state
  const [quizState, setQuizState] = useState<'idle' | 'active' | 'result'>('idle');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Daily challenge
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallengeData | null>(null);
  const [dcQuizState, setDcQuizState] = useState<'idle' | 'active' | 'result'>('idle');
  const [dcCurrentQ, setDcCurrentQ] = useState(0);
  const [dcAnswers, setDcAnswers] = useState<number[]>([]);
  const [dcSelected, setDcSelected] = useState<number | null>(null);
  const [dcShowExp, setDcShowExp] = useState(false);
  const [dcResult, setDcResult] = useState<QuizResult | null>(null);

  // Word of day
  const [wordOfDay, setWordOfDay] = useState<WordOfDayData | null>(null);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<Array<{
    rank: number; name: string; avatar?: string | null; xp: number;
    level: number; streak: number; isCurrentUser: boolean;
  }>>([]);
  const [userRank, setUserRank] = useState<number | null>(null);

  // Gamification profile
  const [badges, setBadges] = useState<BadgeInfo[]>([]);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/learning', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setPaths(data.data.paths);
        setGam(data.data.gamification);
      }
    } catch (err) {
      console.error('Learning fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch tab-specific data
  const fetchDailyChallenge = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/learning/daily-challenge', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setDailyChallenge(data.data);
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchWordOfDay = useCallback(async () => {
    try {
      const res = await fetch('/api/learning/word-of-day');
      const data = await res.json();
      if (data.success) setWordOfDay(data.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/learning/leaderboard', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.data.leaderboard);
        setUserRank(data.data.userRank);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchGamProfile = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/learning/gamification', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setBadges(data.data.badges);
        setGam(prev => prev ? { ...prev, ...data.data } : null);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'daily') fetchDailyChallenge();
    if (activeTab === 'word') fetchWordOfDay();
    if (activeTab === 'leaderboard') fetchLeaderboard();
    if (activeTab === 'profile') fetchGamProfile();
  }, [activeTab, fetchDailyChallenge, fetchWordOfDay, fetchLeaderboard, fetchGamProfile]);

  // ── Start lesson ──
  const startLesson = async (pathId: string, moduleId: string) => {
    setActivePathId(pathId);
    const path = paths.find(p => p.id === pathId);
    const mod = path?.modules.find(m => m.id === moduleId);
    if (mod) setActiveModule(mod);

    try {
      const res = await fetch(`/api/learning/${pathId}/challenge`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success && data.data) {
        const modData = data.data.find((m: ModuleInfo & { challenge?: ChallengeInfo }) => m.id === moduleId);
        if (modData?.challenge) setActiveChallenge(modData.challenge);
      }
    } catch (e) { console.error(e); }
  };

  // ── Quiz functions ──
  const startQuiz = () => { setQuizState('active'); setCurrentQ(0); setAnswers([]); setSelectedAnswer(null); setShowExplanation(false); };
  const handleQuizAnswer = (idx: number) => {
    setSelectedAnswer(idx);
    setShowExplanation(true);
    setAnswers(prev => [...prev, idx]);
  };
  const nextQuestion = () => {
    if (currentQ < (activeChallenge?.questions.length ?? 0) - 1) {
      setCurrentQ(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    if (!activeChallenge || !activePathId || !activeModule) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/learning/${activePathId}/challenge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId: activeModule.id, answers }),
      });
      const data = await res.json();
      if (data.success) {
        setQuizResult(data.data);
        setQuizState('result');
        if (data.data.passed) {
          toast({ title: '🎉 Quiz Passed!', description: `+${data.data.xpEarned} XP, +${data.data.coinsEarned} Coins` });
          fetchAll();
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to submit quiz', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Daily Challenge functions ──
  const startDcQuiz = () => { setDcQuizState('active'); setDcCurrentQ(0); setDcAnswers([]); setDcSelected(null); setDcShowExp(false); };
  const handleDcAnswer = (idx: number) => { setDcSelected(idx); setDcShowExp(true); setDcAnswers(prev => [...prev, idx]); };
  const nextDcQuestion = () => {
    if (dcCurrentQ < (dailyChallenge?.questions?.length ?? 0) - 1) {
      setDcCurrentQ(prev => prev + 1);
      setDcSelected(null);
      setDcShowExp(false);
    } else submitDcQuiz();
  };

  const submitDcQuiz = async () => {
    if (!dailyChallenge?.questions) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/learning/daily-challenge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: dcAnswers }),
      });
      const data = await res.json();
      if (data.success) {
        setDcResult(data.data);
        setDcQuizState('result');
        if (data.data.xpEarned > 0) {
          toast({ title: 'Daily Challenge Complete! 🏆', description: `+${data.data.xpEarned} XP, +${data.data.coinsEarned} Coins` });
          fetchAll();
        }
      }
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  // ── Helpers ──
  const getLevelInfo = (level: number) => LEVEL_LABELS[Math.min(level, 6)] || LEVEL_LABELS[1];
  const isModuleUnlocked = (path: LearningPathInfo, mod: ModuleInfo) => {
    const idx = path.modules.indexOf(mod);
    if (idx === 0) return true;
    return path.modules[idx - 1].status === 'COMPLETED';
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-bg-surface-alt" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 rounded-xl bg-bg-surface-alt" />)}
        </div>
      </div>
    );
  }

  // ── Active lesson view ──
  if (activeModule && activeChallenge && activePathId) {
    return (
      <LessonView
        module={activeModule}
        challenge={activeChallenge}
        quizState={quizState}
        currentQ={currentQ}
        selectedAnswer={selectedAnswer}
        showExplanation={showExplanation}
        quizResult={quizResult}
        submitting={submitting}
        onStartQuiz={startQuiz}
        onAnswer={handleQuizAnswer}
        onNext={nextQuestion}
        onClose={() => { setActiveModule(null); setActiveChallenge(null); setActivePathId(null); setQuizState('idle'); setQuizResult(null); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header with gamification stats ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">Learn & Earn 📚</h2>
          <p className="text-sm text-text-secondary mt-1">Video lessons + MCQ quizzes → XP, badges, streaks!</p>
        </div>
        {gam && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-600">{gam.streak}</span>
              <span className="text-xs text-orange-400">day streak</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1.5">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-bold text-yellow-600">{formatNumber(gam.xp)}</span>
              <span className="text-xs text-yellow-400">XP</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 px-3 py-1.5">
              <Coins className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-bold text-purple-600">{gam.coins}</span>
              <span className="text-xs text-purple-400">coins</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-3 py-1.5">
              <Trophy className="h-4 w-4 text-brand-primary" />
              <span className="text-sm font-bold text-brand-primary">Lv.{gam.level}</span>
              <span className="text-xs text-brand-primary/60">{getLevelInfo(gam.level).icon}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── XP Progress Bar ── */}
      {gam && (
        <div className="rounded-xl border border-border bg-bg-surface p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getLevelInfo(gam.level).icon}</span>
              <span className={cn('font-bold text-sm', getLevelInfo(gam.level).color)}>{getLevelInfo(gam.level).name}</span>
            </div>
            <span className="text-xs text-text-secondary">{formatNumber(gam.xp)} / {gam.level < 6 ? ['500', '1500', '3500', '7000', '12000', '∞'][gam.level - 1] : '∞'} XP</span>
          </div>
          <Progress value={Math.min(((gam.xp % (gam.level === 6 ? 12000 : [500, 1500, 3500, 7000, 12000][gam.level - 1])) / ([500, 1500, 3500, 7000, 12000, 99999][gam.level - 1])) * 100, 100)} className="h-2" />
          <div className="flex items-center justify-between mt-2 text-[10px] text-text-tertiary">
            <span>{gam.lessonsCompleted} lessons done</span>
            <span>{gam.quizzesPassed} quizzes passed</span>
            <span>{gam.badgesEarned} badges</span>
          </div>
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-bg-surface-alt overflow-x-auto">
        {([
          { key: 'paths' as const, label: '📚 Learning Paths', },
          { key: 'daily' as const, label: '⚡ Daily Challenge', },
          { key: 'word' as const, label: '📖 Word of Day', },
          { key: 'leaderboard' as const, label: '🏆 Leaderboard', },
          { key: 'profile' as const, label: '🎖️ My Profile', },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 min-w-[120px] px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-background text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'paths' && (
          <motion.div key="paths" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {paths.map((path) => (
              <PathCard key={path.id} path={path} isExpanded={expandedPath === path.id} onToggle={() => setExpandedPath(expandedPath === path.id ? null : path.id)} onStart={startLesson} />
            ))}
          </motion.div>
        )}

        {activeTab === 'daily' && dailyChallenge && (
          <motion.div key="daily" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <DailyChallengeView
              data={dailyChallenge}
              quizState={dcQuizState}
              currentQ={dcCurrentQ}
              selectedAnswer={dcSelected}
              showExplanation={dcShowExp}
              result={dcResult}
              submitting={submitting}
              onStart={startDcQuiz}
              onAnswer={handleDcAnswer}
              onNext={nextDcQuestion}
            />
          </motion.div>
        )}

        {activeTab === 'word' && wordOfDay && (
          <motion.div key="word" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <WordOfDayView data={wordOfDay} />
          </motion.div>
        )}

        {activeTab === 'leaderboard' && (
          <motion.div key="lb" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <LeaderboardView leaderboard={leaderboard} userRank={userRank} />
          </motion.div>
        )}

        {activeTab === 'profile' && gam && (
          <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ProfileView gam={gam} badges={badges} levelInfo={getLevelInfo(gam.level)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Path Card ───────────────────────────────────────────────
function PathCard({ path, isExpanded, onToggle, onStart }: {
  path: LearningPathInfo;
  isExpanded: boolean;
  onToggle: () => void;
  onStart: (pathId: string, moduleId: string) => void;
}) {
  const levelColors: Record<string, string> = {
    BEGINNER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    INTERMEDIATE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    ADVANCED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="rounded-xl border border-border bg-bg-surface overflow-hidden transition-all">
      {/* Header */}
      <button onClick={onToggle} className="w-full flex items-center gap-4 p-4 sm:p-5 hover:bg-bg-surface-alt/50 transition-colors text-left">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10 text-2xl shrink-0">{path.icon || '📚'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading font-bold text-text-primary truncate">{path.title}</h3>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', levelColors[path.level] || '')}>{path.level}</span>
            {path.completedModules === path.totalModules && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
          </div>
          <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{path.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <Progress value={path.progress} className="h-1.5 flex-1 max-w-[200px]" />
            <span className="text-[10px] text-text-tertiary font-mono">{path.completedModules}/{path.totalModules} · {path.totalXP} XP</span>
          </div>
        </div>
        <ChevronDown className={cn('h-5 w-5 text-text-tertiary transition-transform shrink-0', isExpanded && 'rotate-180')} />
      </button>

      {/* Expanded modules */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-border px-4 py-3 space-y-2">
              {path.modules.map((mod, idx) => {
                const unlocked = isModuleUnlocked(path, mod);
                const isCompleted = mod.status === 'COMPLETED';
                return (
                  <button
                    key={mod.id}
                    disabled={!unlocked}
                    onClick={() => unlocked && onStart(path.id, mod.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
                      unlocked ? 'hover:bg-bg-surface-alt cursor-pointer' : 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg shrink-0 text-sm font-bold',
                      isCompleted ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                      unlocked ? 'bg-brand-primary/10 text-brand-primary' : 'bg-bg-surface-alt text-text-tertiary'
                    )}>
                      {isCompleted ? <CheckCircle className="h-4 w-4" /> :
                       unlocked ? <Play className="h-3.5 w-3.5" /> :
                       <Lock className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{idx + 1}. {mod.title}</p>
                      <p className="text-[10px] text-text-tertiary">{mod.duration}m · +{mod.xpReward} XP{mod.videoUrl ? ' · 📹 Video' : ''}</p>
                    </div>
                    {isCompleted && <span className="text-[10px] font-bold text-green-500">{mod.score}%</span>}
                    {unlocked && !isCompleted && <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Lesson View ──────────────────────────────────────────────
function LessonView({ module, challenge, quizState, currentQ, selectedAnswer, showExplanation, quizResult, submitting, onStartQuiz, onAnswer, onNext, onClose }: {
  module: ModuleInfo;
  challenge: ChallengeInfo;
  quizState: 'idle' | 'active' | 'result';
  currentQ: number;
  selectedAnswer: number | null;
  showExplanation: boolean;
  quizResult: QuizResult | null;
  submitting: boolean;
  onStartQuiz: () => void;
  onAnswer: (idx: number) => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const questions = challenge.questions;
  const currentQuestion = questions[currentQ];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button onClick={onClose} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
        <RotateCcw className="h-4 w-4" /> Back to Learning Paths
      </button>

      {/* Lesson Header */}
      <div className="rounded-xl border border-border bg-bg-surface p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10">
            <BookOpen className="h-5 w-5 text-brand-primary" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-text-primary">{module.title}</h3>
            <p className="text-xs text-text-secondary">{module.duration}m · +{module.xpReward} XP</p>
          </div>
        </div>

        {/* Video Player */}
        {module.videoUrl && (
          <div className="rounded-xl overflow-hidden bg-black mb-4 aspect-video">
            <iframe
              src={module.videoUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={module.title}
            />
          </div>
        )}

        {module.description && <p className="text-sm text-text-secondary">{module.description}</p>}

        {/* Quiz Button */}
        {quizState === 'idle' && (
          <button
            onClick={onStartQuiz}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-primary text-white font-semibold hover:bg-brand-primary-hover transition-colors"
          >
            <Brain className="h-5 w-5" />
            Start Quiz ({questions.length} Questions · +{challenge.xpReward} XP)
          </button>
        )}
      </div>

      {/* Quiz Active */}
      {quizState === 'active' && currentQuestion && (
        <div className="rounded-xl border border-border bg-bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">Question {currentQ + 1} of {questions.length}</Badge>
            <Progress value={((currentQ + 1) / questions.length) * 100} className="h-1.5 w-24" />
          </div>
          <h4 className="font-semibold text-text-primary">{currentQuestion.question}</h4>
          <div className="space-y-2">
            {currentQuestion.options.map((opt, idx) => {
              const isCorrect = idx === currentQuestion.correct;
              const isSelected = selectedAnswer === idx;
              let optClass = 'border-border hover:border-brand-primary/50 hover:bg-brand-primary/5';
              if (selectedAnswer !== null) {
                if (isCorrect) optClass = 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400';
                else if (isSelected && !isCorrect) optClass = 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
                else optClass = 'opacity-50';
              } else {
                optClass = 'border-border hover:border-brand-primary/50 hover:bg-brand-primary/5';
              }
              return (
                <button
                  key={idx}
                  disabled={selectedAnswer !== null}
                  onClick={() => onAnswer(idx)}
                  className={cn('w-full p-3 rounded-xl border text-left text-sm transition-all', optClass)}
                >
                  <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {opt}
                  {selectedAnswer !== null && isCorrect && <CheckCircle className="inline h-4 w-4 ml-2 text-green-500" />}
                  {selectedAnswer !== null && isSelected && !isCorrect && <X className="inline h-4 w-4 ml-2 text-red-500" />}
                </button>
              );
            })}
          </div>
          {showExplanation && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300"><strong>💡 Explanation:</strong> {currentQuestion.explanation}</p>
            </motion.div>
          )}
          {selectedAnswer !== null && (
            <button onClick={onNext} className="w-full py-3 rounded-xl bg-brand-primary text-white font-semibold hover:bg-brand-primary-hover transition-colors">
              {currentQ < questions.length - 1 ? 'Next Question →' : (submitting ? 'Submitting...' : 'Submit Quiz')}
            </button>
          )}
        </div>
      )}

      {/* Quiz Result */}
      {quizState === 'result' && quizResult && (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-xl border border-border bg-bg-surface p-6 text-center space-y-4">
          <div className="text-5xl">{quizResult.perfect ? '🏆' : quizResult.passed ? '🎉' : '😞'}</div>
          <h3 className="font-heading text-xl font-bold text-text-primary">
            {quizResult.perfect ? 'Perfect Score!' : quizResult.passed ? 'Quiz Passed!' : 'Try Again!'}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-bg-surface-alt p-3">
              <p className="text-lg font-bold text-text-primary">{quizResult.correct}/{quizResult.total}</p>
              <p className="text-[10px] text-text-tertiary">Correct</p>
            </div>
            <div className="rounded-lg bg-bg-surface-alt p-3">
              <p className="text-lg font-bold text-brand-primary">+{quizResult.xpEarned}</p>
              <p className="text-[10px] text-text-tertiary">XP Earned</p>
            </div>
            <div className="rounded-lg bg-bg-surface-alt p-3">
              <p className="text-lg font-bold text-purple-600">+{quizResult.coinsEarned}</p>
              <p className="text-[10px] text-text-tertiary">Coins</p>
            </div>
          </div>
          {quizResult.newBadges && quizResult.newBadges.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200">
              <p className="text-sm font-bold text-amber-700">🏅 New Badges: {quizResult.newBadges.join(', ')}</p>
            </div>
          )}
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-brand-primary text-white font-semibold hover:bg-brand-primary-hover transition-colors">
            Continue Learning →
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ── Daily Challenge ──────────────────────────────────────────
function DailyChallengeView({ data, quizState, currentQ, selectedAnswer, showExplanation, result, submitting, onStart, onAnswer, onNext }: {
  data: DailyChallengeData;
  quizState: 'idle' | 'active' | 'result';
  currentQ: number;
  selectedAnswer: number | null;
  showExplanation: boolean;
  result: QuizResult | null;
  submitting: boolean;
  onStart: () => void;
  onAnswer: (idx: number) => void;
  onNext: () => void;
}) {
  const questions = data.questions || [];
  const currentQuestion = questions[currentQ];

  if (data.alreadyAttempted) {
    return (
      <div className="rounded-xl border border-border bg-bg-surface p-6 text-center space-y-4">
        <div className="text-4xl">🎯</div>
        <h3 className="font-heading text-lg font-bold text-text-primary">Today&apos;s Challenge Done!</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-bg-surface-alt p-3">
            <p className="text-lg font-bold text-text-primary">{data.correct}/{data.total}</p>
            <p className="text-[10px] text-text-tertiary">Correct</p>
          </div>
          <div className="rounded-lg bg-bg-surface-alt p-3">
            <p className="text-lg font-bold text-brand-primary">+{data.xpEarned}</p>
            <p className="text-[10px] text-text-tertiary">XP</p>
          </div>
          <div className="rounded-lg bg-bg-surface-alt p-3">
            <p className="text-lg font-bold text-purple-600">+{data.coinsEarned}</p>
            <p className="text-[10px] text-text-tertiary">Coins</p>
          </div>
        </div>
        <p className="text-sm text-text-secondary">Come back tomorrow for a new challenge! 🔥</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-surface p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Target className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-text-primary">Daily Challenge</h3>
          <p className="text-xs text-text-secondary">{data.topic || 'Mixed'} · 5 Questions · Win up to 100 XP!</p>
        </div>
      </div>

      {quizState === 'idle' && (
        <button onClick={onStart} className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-600 hover:to-orange-600 transition-all">
          ⚡ Start Daily Challenge
        </button>
      )}

      {quizState === 'active' && currentQuestion && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">Q{currentQ + 1}/{questions.length}</Badge>
            <Progress value={((currentQ + 1) / questions.length) * 100} className="h-1.5 w-24" />
          </div>
          <h4 className="font-semibold text-text-primary">{currentQuestion.question}</h4>
          <div className="space-y-2">
            {currentQuestion.options.map((opt, idx) => {
              const isCorrect = idx === currentQuestion.correct;
              const isSelected = selectedAnswer === idx;
              let cls = 'border-border hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10';
              if (selectedAnswer !== null) {
                if (isCorrect) cls = 'border-green-500 bg-green-50 dark:bg-green-900/20';
                else if (isSelected && !isCorrect) cls = 'border-red-500 bg-red-50 dark:bg-red-900/20';
                else cls = 'opacity-50';
              }
              return (
                <button key={idx} disabled={selectedAnswer !== null} onClick={() => onAnswer(idx)} className={cn('w-full p-3 rounded-xl border text-left text-sm transition-all', cls)}>
                  {String.fromCharCode(65 + idx)}. {opt}
                </button>
              );
            })}
          </div>
          {showExplanation && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300">
              💡 {currentQuestion.explanation}
            </div>
          )}
          {selectedAnswer !== null && (
            <button onClick={onNext} className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors">
              {currentQ < questions.length - 1 ? 'Next →' : (submitting ? 'Submitting...' : 'Submit')}
            </button>
          )}
        </div>
      )}

      {quizState === 'result' && result && (
        <div className="text-center space-y-3">
          <div className="text-4xl">{result.perfect ? '🏆' : result.scorePct >= 60 ? '🎉' : '😅'}</div>
          <h3 className="font-bold text-text-primary">{result.perfect ? 'Perfect!' : result.scorePct >= 60 ? 'Well Done!' : 'Better luck tomorrow!'}</h3>
          <div className="flex justify-center gap-4">
            <div><span className="text-xl font-bold">{result.correct}/{result.total}</span><p className="text-[10px] text-text-tertiary">Correct</p></div>
            <div><span className="text-xl font-bold text-brand-primary">+{result.xpEarned}</span><p className="text-[10px] text-text-tertiary">XP</p></div>
            <div><span className="text-xl font-bold text-purple-600">+{result.coinsEarned}</span><p className="text-[10px] text-text-tertiary">Coins</p></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Word of Day ─────────────────────────────────────────────
function WordOfDayView({ data }: { data: WordOfDayData }) {
  return (
    <div className="rounded-xl border border-border bg-bg-surface overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-purple-500" />
          <Badge variant="secondary">{data.category}</Badge>
          <span className="text-[10px] text-text-tertiary ml-auto">{data.date}</span>
        </div>
        <h3 className="font-heading text-3xl font-bold text-text-primary">{data.word}</h3>
        <p className="text-sm text-text-secondary leading-relaxed">{data.meaning}</p>
        {data.example && (
          <div className="p-3 rounded-lg bg-bg-surface/80 border border-border">
            <p className="text-xs text-text-secondary"><strong>Example:</strong> {data.example}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Leaderboard ─────────────────────────────────────────────
function LeaderboardView({ leaderboard, userRank }: {
  leaderboard: Array<{ rank: number; name: string; avatar?: string | null; xp: number; level: number; streak: number; isCurrentUser: boolean }>;
  userRank: number | null;
}) {
  const rankIcons = ['🥇', '🥈', '🥉'];
  return (
    <div className="space-y-4">
      {userRank && (
        <div className="rounded-xl bg-brand-primary/5 border border-brand-primary/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-brand-primary" />
            <span className="text-sm font-bold text-text-primary">Your Rank</span>
          </div>
          <span className="text-2xl font-bold text-brand-primary">#{userRank}</span>
        </div>
      )}
      <div className="rounded-xl border border-border bg-bg-surface overflow-hidden">
        <div className="divide-y divide-border">
          {leaderboard.slice(0, 20).map((entry) => (
            <div key={entry.rank} className={cn('flex items-center gap-3 p-3', entry.isCurrentUser && 'bg-brand-primary/5')}>
              <div className="w-8 text-center text-lg font-bold">
                {entry.rank <= 3 ? rankIcons[entry.rank - 1] : <span className="text-text-tertiary text-sm">#{entry.rank}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium truncate', entry.isCurrentUser && 'text-brand-primary')}>{entry.name}</p>
                <p className="text-[10px] text-text-tertiary">Lv.{entry.level} · 🔥{entry.streak} days</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-text-primary">{formatNumber(entry.xp)}</p>
                <p className="text-[10px] text-text-tertiary">XP</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Profile View ──────────────────────────────────────────────
function ProfileView({ gam, badges, levelInfo }: { gam: GamificationInfo; badges: BadgeInfo[]; levelInfo: { name: string; icon: string; color: string } }) {
  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Zap className="h-4 w-4" />, label: 'Total XP', value: formatNumber(gam.xp), color: 'text-yellow-600' },
          { icon: <Flame className="h-4 w-4" />, label: 'Best Streak', value: `${gam.longestStreak} days`, color: 'text-orange-600' },
          { icon: <Brain className="h-4 w-4" />, label: 'Quizzes Passed', value: String(gam.quizzesPassed), color: 'text-blue-600' },
          { icon: <Star className="h-4 w-4" />, label: 'Perfect Scores', value: String(gam.perfectQuizzes), color: 'text-purple-600' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-bg-surface p-4 text-center">
            <div className="flex justify-center text-text-tertiary mb-2">{stat.icon}</div>
            <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
            <p className="text-[10px] text-text-tertiary">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Level Card */}
      <div className="rounded-xl border border-border bg-bg-surface p-5">
        <div className="flex items-center gap-4">
          <div className="text-5xl">{levelInfo.icon}</div>
          <div>
            <h3 className={cn('font-heading text-xl font-bold', levelInfo.color)}>{levelInfo.name}</h3>
            <p className="text-xs text-text-secondary">Level {gam.level}</p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="rounded-xl border border-border bg-bg-surface p-5 space-y-3">
        <h3 className="font-heading font-bold text-text-primary">🏅 Badges ({badges.length})</h3>
        {badges.length === 0 ? (
          <p className="text-sm text-text-secondary">No badges yet. Complete lessons and quizzes to earn badges!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {badges.map((badge) => (
              <div key={badge.id} className="rounded-lg bg-bg-surface-alt p-3 text-center">
                <div className="text-3xl mb-1">{badge.icon}</div>
                <p className="text-xs font-medium text-text-primary truncate">{badge.name}</p>
                <p className="text-[10px] text-text-tertiary">{new Date(badge.earnedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Streak Freeze */}
      <div className="rounded-xl border border-border bg-bg-surface p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-sm font-medium text-text-primary">Streak Freezes</p>
            <p className="text-[10px] text-text-secondary">Protect your streak when you miss a day</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-blue-600">{gam.streakFreeze}</span>
          <span className="text-[10px] text-text-tertiary">available</span>
        </div>
      </div>
    </div>
  );
}
