export type SubscriptionPlan = 'FREE' | 'PRO' | 'PREMIUM'

export interface PlanLimits {
  maxTradesPerMonth: number
  maxOpenPositions: number
  activeSessions: number
  optionsAccess: boolean
  futuresAccess: boolean
  advancedReports: boolean
  prioritySupport: boolean
  customWatchlists: boolean
  virtualBalance: number
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    maxTradesPerMonth: 50,
    maxOpenPositions: 5,
    activeSessions: 2,
    optionsAccess: true,
    futuresAccess: true,
    advancedReports: false,
    prioritySupport: false,
    customWatchlists: false,
    virtualBalance: 100000,
  },
  PRO: {
    maxTradesPerMonth: 500,
    maxOpenPositions: 20,
    activeSessions: 3,
    optionsAccess: true,
    futuresAccess: true,
    advancedReports: true,
    prioritySupport: false,
    customWatchlists: true,
    virtualBalance: 500000,
  },
  PREMIUM: {
    maxTradesPerMonth: -1, // unlimited
    maxOpenPositions: -1,  // unlimited
    activeSessions: 5,
    optionsAccess: true,
    futuresAccess: true,
    advancedReports: true,
    prioritySupport: true,
    customWatchlists: true,
    virtualBalance: 1000000,
  },
}

export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE
}
