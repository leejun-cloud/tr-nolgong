import type React from "react"
import type { Metadata } from "next"
import { AuthProvider } from "@/contexts/AuthContext"
import { Header } from "@/components/header"
import "./globals.css"

export const metadata: Metadata = {
  title: "문서 번역기 — 놀공 Translate",
  description: "DOCX, PPTX 문서를 원하는 언어로 번역합니다. 원본 스타일 100% 보존, 대량 문서 지원.",
  keywords: "문서번역, DOCX번역, PPTX번역, 스타일보존, 놀공, nolgong",
  icons: {
    icon: "/images/nolgonglogo.png",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://tr.nolgong.app",
    siteName: "놀공 Translate",
    title: "문서 번역기 — 놀공 Translate",
    description: "DOCX, PPTX 문서를 원하는 언어로 번역합니다. 원본 스타일 100% 보존.",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <Header />
          <main className="min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
