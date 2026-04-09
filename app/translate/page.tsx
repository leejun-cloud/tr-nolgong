"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { TranslateApp } from "@/components/translate/translate-app"

export default function TranslatePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    )
  }

  if (!user) return null

  return <TranslateApp />
}
