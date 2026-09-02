import Link from 'next/link';
import { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              HueViVu Admin
            </Link>
          </div>
          <nav className="flex gap-4">
            <Link href="/admin/data-collector" className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors">
              Places Data Collector
            </Link>
            <Link href="/admin/ai-trainer" className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors">
              AI Trainer
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
