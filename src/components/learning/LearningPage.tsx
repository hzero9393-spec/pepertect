'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/common';
import { GraduationCap, BookOpen, CheckCircle, Play } from 'lucide-react';
import type { LearningPath, Module } from '@/types';

export function LearningPage() {
  const { token } = useAuthStore();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaths = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/learning', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setPaths(data.data);
      } catch (err) {
        console.error('Learning fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPaths();
  }, [token]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER': return 'bg-profit-green/10 text-profit-green';
      case 'INTERMEDIATE': return 'bg-warning-amber/10 text-warning-amber';
      case 'ADVANCED': return 'bg-loss-red/10 text-loss-red';
      default: return 'bg-bg-surface-alt text-text-secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">Learning Paths</h2>
          <p className="text-sm text-text-secondary mt-1">Structured courses from beginner to advanced — all free</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-lg bg-bg-surface" />)}</div>
      ) : paths.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-10 w-10 text-text-tertiary" />}
          title="No learning paths yet"
          description="Content is coming soon!"
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paths.map((path) => {
            const completedModules = path.modules.filter((m) => m.status === 'COMPLETED').length;

            return (
              <Card key={path.id} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10">
                      <GraduationCap className="h-5 w-5 text-brand-primary" />
                    </div>
                    <Badge className={getLevelColor(path.level)}>{path.level}</Badge>
                  </div>
                  <CardTitle className="font-heading text-base mt-3">{path.title}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2">{path.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-text-secondary">
                      <span>{path.modules.length} modules</span>
                      <span>{completedModules}/{path.modules.length} completed</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-surface-alt overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-primary transition-all"
                        style={{ width: `${path.modules.length > 0 ? (completedModules / path.modules.length) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="pt-2 space-y-1">
                      {path.modules.map((mod) => (
                        <div key={mod.id} className="flex items-center gap-2 text-xs">
                          {mod.status === 'COMPLETED' ? (
                            <CheckCircle className="h-3.5 w-3.5 text-profit-green shrink-0" />
                          ) : (
                            <Play className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                          )}
                          <span className={mod.status === 'COMPLETED' ? 'text-text-secondary' : 'text-text-primary'}>{mod.title}</span>
                          {mod.duration && <span className="ml-auto text-text-secondary">{mod.duration}m</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
