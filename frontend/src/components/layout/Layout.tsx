import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'

export function Layout() {
  return (
    <div
      className="flex bg-[#0f0f0f] text-gray-100 font-sans overflow-hidden"
      style={{ height: '100dvh' }}
    >
      {/* ── Desktop sidebar (hidden on mobile/tablet) ── */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* ── Main column ── */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header />

        <main className="flex-1 overflow-auto mobile-nav-pb">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom nav (hidden on desktop) ── */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
