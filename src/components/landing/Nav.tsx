'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

function DepthStackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="0" y="0" width="10" height="10" rx="2" fill="#6366F1" opacity="0.30" />
      <rect x="4" y="4" width="10" height="10" rx="2" fill="#6366F1" opacity="0.55" />
      <rect x="8" y="8" width="10" height="10" rx="2" fill="#6366F1" />
    </svg>
  )
}

const navLinks = [
  { label: 'Features',   href: '#features'   },
  { label: 'Warum WBC', href: '#warum-wbc'  },
  { label: 'Preise',     href: '#preise'     },
  { label: 'FAQ',        href: '#faq'        },
]

function smoothScroll(href: string) {
  document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
}

export default function Nav() {
  const [scrolled,    setScrolled]    = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm'
            : 'bg-white/80 backdrop-blur-sm'
        }`}
      >
        <div className="w-full px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <DepthStackIcon />
            <span className="font-syne text-[17px] font-bold text-[#0F1117] tracking-tight leading-none">
              WBC Studio
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => { e.preventDefault(); smoothScroll(l.href) }}
                className="text-[14px] font-medium text-gray-500 hover:text-[#6366F1] transition-colors cursor-pointer"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA + hamburger */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden md:inline-flex items-center px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[14px] font-semibold rounded-lg transition-colors"
            >
              Anmelden
            </Link>
            <button
              className="md:hidden p-1.5 text-gray-600 hover:text-gray-900 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menü"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-in */}
      <div
        className={`fixed inset-0 z-40 bg-white flex flex-col px-6 pt-20 pb-8 transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <nav className="flex flex-col gap-1">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => { e.preventDefault(); setMobileOpen(false); smoothScroll(l.href) }}
              className="text-[16px] font-medium text-gray-800 py-3.5 border-b border-gray-100 hover:text-[#6366F1] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <Link
          href="/login"
          onClick={() => setMobileOpen(false)}
          className="mt-8 w-full flex items-center justify-center py-3.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[15px] font-semibold rounded-xl transition-colors"
        >
          Anmelden
        </Link>
      </div>
    </>
  )
}
