'use client';

import { cn } from '@/lib/utils';

/**
 * Lightweight inline SVG sparkline for index cards.
 * Generates a smooth-ish polyline from `data` (numbers).
 * Color is derived from `positive` (green / red).
 */
export function Sparkline({
  data,
  positive = true,
  width = 80,
  height = 32,
  className,
  color,
}: {
  data: number[];
  positive?: boolean;
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}) {
  const resolvedColor = color || (positive ? '#10B981' : '#EF4444');
  if (!data || data.length < 2) {
    // Fallback: flat baseline
    return (
      <svg
        className={cn('sparkline', className)}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={resolvedColor}
          strokeWidth="1.5"
          strokeDasharray="2 3"
          opacity="0.5"
        />
      </svg>
    );
  }

  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = innerW / (data.length - 1);

  const points = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });

  // Build a smooth path (Catmull-Rom-ish) using quadratic curves
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    const [px, py] = points[i - 1];
    const cx = (px + x) / 2;
    const cy = (py + y) / 2;
    d += ` Q ${px} ${py} ${cx} ${cy}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last[0]} ${last[1]}`;

  const strokeColor = resolvedColor;
  const fillId = `spark-${positive ? 'g' : 'r'}-${Math.round(data[0] + data[data.length - 1])}`;

  const areaPath = `${d} L ${last[0]} ${height - pad} L ${pad} ${height - pad} Z`;

  return (
    <svg
      className={cn('sparkline', className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${fillId})`} />
      <path d={d} stroke={strokeColor} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
