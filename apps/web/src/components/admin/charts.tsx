'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DataPoint {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  data: DataPoint[];
  height?: number;
  className?: string;
  barColor?: string;
  showValues?: boolean;
}

export function SimpleBarChart({
  data,
  height = 200,
  className,
  barColor = 'bg-primary',
  showValues = true,
}: SimpleBarChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <div className="flex items-end justify-between gap-2 h-full">
        {data.map((point, index) => {
          const barHeight = (point.value / maxValue) * 100;
          return (
            <div key={index} className="flex flex-col items-center flex-1 h-full">
              <div className="flex-1 w-full flex flex-col justify-end">
                {showValues && (
                  <span className="text-xs text-center text-muted-foreground mb-1">
                    {point.value}
                  </span>
                )}
                <div
                  className={cn('w-full rounded-t transition-all', barColor)}
                  style={{ height: `${barHeight}%`, minHeight: point.value > 0 ? '4px' : '0' }}
                />
              </div>
              <span className="text-xs text-muted-foreground mt-2 truncate max-w-full">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SimpleLineChartProps {
  data: DataPoint[];
  height?: number;
  className?: string;
  lineColor?: string;
  showDots?: boolean;
}

export function SimpleLineChart({
  data,
  height = 200,
  className,
  lineColor = 'stroke-primary',
  showDots = true,
}: SimpleLineChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);
  const minValue = useMemo(() => Math.min(...data.map((d) => d.value), 0), [data]);
  const range = maxValue - minValue || 1;

  const points = useMemo(() => {
    const width = 100 / (data.length - 1 || 1);
    return data.map((point, index) => ({
      x: index * width,
      y: 100 - ((point.value - minValue) / range) * 100,
      ...point,
    }));
  }, [data, minValue, range]);

  const pathD = useMemo(() => {
    if (points.length < 2) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');
  }, [points]);

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        {/* Grid lines */}
        <line x1="0" y1="25" x2="100" y2="25" className="stroke-muted" strokeWidth="0.2" />
        <line x1="0" y1="50" x2="100" y2="50" className="stroke-muted" strokeWidth="0.2" />
        <line x1="0" y1="75" x2="100" y2="75" className="stroke-muted" strokeWidth="0.2" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          className={cn(lineColor)}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />

        {/* Dots */}
        {showDots &&
          points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="1.5"
              className={cn('fill-primary', lineColor.replace('stroke-', 'fill-'))}
            />
          ))}
      </svg>
      <div className="flex justify-between mt-2">
        {data.map((point, index) => (
          <span key={index} className="text-xs text-muted-foreground">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  className?: string;
  showLegend?: boolean;
}

export function DonutChart({
  data,
  size = 160,
  className,
  showLegend = true,
}: DonutChartProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  const segments = useMemo(() => {
    let currentAngle = 0;
    return data.map((item) => {
      const angle = total > 0 ? (item.value / total) * 360 : 0;
      const segment = {
        ...item,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
      };
      currentAngle += angle;
      return segment;
    });
  }, [data, total]);

  const getArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(50, 50, radius, endAngle);
    const end = polarToCartesian(50, 50, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    ].join(' ');
  };

  const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => {
    const angleInRadians = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(angleInRadians),
      y: cy + radius * Math.sin(angleInRadians),
    };
  };

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        {segments.map((segment, index) => (
          <path
            key={index}
            d={getArcPath(segment.startAngle, segment.endAngle, 40)}
            fill="none"
            stroke={segment.color}
            strokeWidth="16"
            strokeLinecap="round"
          />
        ))}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold fill-foreground">
          {total}
        </text>
        <text x="50" y="62" textAnchor="middle" className="text-xs fill-muted-foreground">
          Total
        </text>
      </svg>
      {showLegend && (
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface StatTrendProps {
  value: number;
  previousValue: number;
  label: string;
  format?: 'number' | 'percent' | 'currency';
}

export function StatTrend({ value, previousValue, label, format = 'number' }: StatTrendProps) {
  const change = previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : 0;
  const isPositive = change >= 0;

  const formatValue = (val: number) => {
    switch (format) {
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'currency':
        return `$${val.toLocaleString()}`;
      default:
        return val.toLocaleString();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="font-medium">{formatValue(value)}</span>
      {previousValue > 0 && (
        <span className={cn('text-xs', isPositive ? 'text-green-500' : 'text-red-500')}>
          {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </span>
      )}
    </div>
  );
}
