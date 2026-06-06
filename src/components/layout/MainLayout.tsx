import { ReactNode } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      <LeftSidebar />
      <main className="flex-1 min-w-0 overflow-hidden p-5">
        {children}
      </main>
      <RightSidebar />
    </div>
  );
}
