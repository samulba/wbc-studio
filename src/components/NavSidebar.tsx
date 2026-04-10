'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navLinks = [
  { label: 'Übersicht', href: '/dashboard' },
  { label: 'Kunden', href: '/dashboard/kunden' },
  { label: 'Projekte', href: '/dashboard/projekte' },
  { label: 'Partner', href: '/dashboard/partner' },
]

export default function NavSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 shrink-0 bg-wbc-gruen flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <span className="font-heading text-xl font-light tracking-[0.2em] text-white uppercase">
          WBC Studio
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {navLinks.map((link) => {
          const aktiv =
            link.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(link.href)

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${
                aktiv
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/55 hover:text-white hover:bg-white/10'
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* User / Logout */}
      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-xs text-white/35 truncate mb-2">{userEmail}</p>
        <button
          onClick={handleLogout}
          className="text-xs text-white/45 hover:text-white/80 transition-colors"
        >
          Abmelden
        </button>
      </div>
    </aside>
  )
}
