import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, MessageSquare, ArrowLeft } from 'lucide-react'
import { isSuperAdmin } from '@/lib/super-admin'

/**
 * Super-Admin-Layout (App-Owner-Backstage).
 *
 * Erreichbar nur fuer Emails in SUPER_ADMIN_EMAILS (ENV).
 * Doppelt geschuetzt: Middleware redirectet schon, aber wir pruefen
 * hier zusaetzlich (Defense-in-depth).
 *
 * Eigenes dunkles Layout damit klar ist 'du bist gerade in der
 * Backstage' — nicht das normale Dashboard.
 */
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  if (!await isSuperAdmin()) redirect('/dashboard')

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-100">
      {/* Top-Bar */}
      <header className="shrink-0 bg-slate-950 border-b border-slate-800 px-6 py-3 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-slate-400 hover:text-slate-100 inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <div className="w-px h-5 bg-slate-700" />
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold">Super-Admin</span>
          <span className="text-[10px] uppercase tracking-wider bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded">
            Backstage
          </span>
        </div>
        <nav className="ml-6 flex items-center gap-1">
          <Link
            href="/super-admin/feedback"
            className="px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 inline-flex items-center gap-1.5"
          >
            <MessageSquare size={14} /> Feedback
          </Link>
        </nav>
      </header>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
