"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"

export function Header() {
  const { user, logout, loading } = useAuth()

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-gray-900">
          <span>놀공 Translate</span>
        </Link>

        <nav className="flex items-center gap-4">
          {!loading && (
            <>
              {user ? (
                <>
                  <Link
                    href="/translate"
                    className="text-sm font-medium text-gray-600 hover:text-blue-600 transition"
                  >
                    번역하기
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 hidden sm:inline">
                      {user.displayName || user.email}
                    </span>
                    <button
                      onClick={logout}
                      className="text-sm text-gray-500 hover:text-gray-700 transition"
                    >
                      로그아웃
                    </button>
                  </div>
                </>
              ) : (
                <Link href="/login">
                  <button className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition">
                    로그인
                  </button>
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
