"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function AppShell({ children, sidebar, header, footer, className }: AppShellProps) {
  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100', className)}>
      <div className="relative mx-auto max-w-[1600px] px-6 md:px-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-56 w-56 translate-x-12 translate-y-12 rounded-full bg-purple-600/10 blur-2xl" />
        </div>
        {/* Accessibility skip link */}
        <div className="absolute top-0 left-0">
          {/* Skip link will appear on focus */}
        </div>
        {header && (
          <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-slate-900/70 border-b border-slate-700/50 py-4">
            {header}
          </header>
        )}
        <div className="grid gap-8 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_400px] py-8" id="main-content">
          <main className="space-y-6">{children}</main>
          {sidebar && <aside className="space-y-6">{sidebar}</aside>}
        </div>
        {footer && (
          <footer className="py-8 text-center text-xs text-slate-400">{footer}</footer>
        )}
      </div>
    </div>
  )
}