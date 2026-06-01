import React from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'

export function Layout() {
  return (
    <div
      className="flex flex-col bg-[#0f0f0f] text-gray-100 font-sans overflow-hidden"
      style={{ height: '100dvh' }}
    >
      <Header />

      {/* Main content — leave room for bottom nav */}
      <main
        className="flex-1 overflow-auto"
        style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
      >
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
