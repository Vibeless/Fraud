import React from 'react';
import { NavSidebar } from '@/components/layout/NavSidebar';
import { TopBar } from '@/components/layout/TopBar';

/**
 * Dashboard Shell Layout per FFS §2 and DUXS §3.
 * Wires the left navigation sidebar and top bar around dashboard page content.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Navigation Sidebar */}
      <NavSidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Bar with user info & logout */}
        <TopBar />

        {/* Scrollable Page Content Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
