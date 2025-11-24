"use client"

import React from 'react'
import { Card } from '@/components/ui/card'
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
} from 'recharts'

interface ChartPanelProps {
  title: string
  type: 'line' | 'bar' | 'scatter'
  data: any[]
  xKey: string
  yKeys: string[]
  height?: number
  loading?: boolean
}

const colors = ['#16a34a', '#0ea5e9', '#9333ea', '#f59e0b', '#ef4444']

export function ChartPanel({ title, type, data, xKey, yKeys, height = 260, loading = false }: ChartPanelProps) {
  return (
    <Card className="p-4 bg-background/70 backdrop-blur-xl border border-border/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold tracking-wide text-foreground/90">{title}</h3>
        <div className="flex gap-2">
          {yKeys.map((k, i) => (
            <div key={k} className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <div className="h-2 w-2 rounded-sm" style={{ background: colors[i % colors.length] }} />
              {k}
            </div>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="flex flex-col gap-3 animate-pulse" style={{ height }}>
          <div className="h-4 bg-muted/50 rounded w-1/3" />
          <div className="flex-1 bg-muted/30 rounded" />
          <div className="h-3 bg-muted/50 rounded w-1/2" />
        </div>
      ) : (
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          {type === 'line' ? (
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} stroke="#888" />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} stroke="#888" />
              <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {yKeys.map((k, i) => (
                <Line key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} activeDot={{ r: 5 }} animationDuration={800} animationEasing="ease-in-out" />
              ))}
            </LineChart>
          ) : type === 'bar' ? (
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} stroke="#888" />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} stroke="#888" />
              <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {yKeys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={colors[i % colors.length]} radius={[6,6,0,0]} animationDuration={800} animationEasing="ease-in-out" />
              ))}
            </BarChart>
          ) : (
            <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} stroke="#888" />
              <YAxis dataKey={yKeys[0]} tick={{ fontSize: 11 }} tickLine={false} stroke="#888" />
              <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Scatter data={data} fill={colors[0]} animationDuration={800} animationEasing="ease-in-out" />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>
      )}
    </Card>
  )
}

// Example placeholder data generator (can be removed later)
export function generatePlaceholderSeries(points = 12) {
  return Array.from({ length: points }).map((_, i) => ({
    month: `M${i + 1}`,
    revenue: Math.round(50 + Math.random() * 50 + i * 5),
    profit: Math.round(20 + Math.random() * 30 + i * 3),
    risk: Math.round(Math.random() * 100),
    opportunity: Math.round(Math.random() * 100),
  }))
}
