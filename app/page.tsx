"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      {/* Hero */}
      <section className="text-center mb-20">
        <p className="text-sm font-semibold text-blue-600 mb-3">문서 번역의 새로운 경험</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
          번역해도<br />
          <span className="text-blue-600">원본 그대로</span>입니다
        </h1>
        <p className="text-gray-500 text-lg mb-8 leading-relaxed">
          DOCX · PPTX 문서를 원하는 언어로 번역합니다.<br />
          제목, 서식, 표, 그림 — 원본 스타일 100% 보존.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href={user ? "/translate" : "/login"}>
            <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition text-base">
              {user ? "번역 시작하기" : "무료로 시작하기"}
            </button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mb-20">
        <p className="text-sm font-semibold text-blue-600 text-center mb-2">핵심 기능</p>
        <h2 className="text-2xl font-bold text-center mb-10">
          문서 번역이<br />이렇게 쉬웠나요?
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <FeatureCard
            num="01"
            title="원본 스타일 보존"
            desc="제목, 중간제목, 볼드, 이탤릭, 글꼴 색상까지 — XML 레벨에서 텍스트만 교체하여 원본 서식 100% 유지"
          />
          <FeatureCard
            num="02"
            title="스마트 청킹"
            desc="대용량 문서도 단원·섹션 단위로 자동 분할하여 중간 끊김 없이 완전 번역"
          />
          <FeatureCard
            num="03"
            title="대량 문서 처리"
            desc="여러 파일을 한번에 업로드하고 순차 번역. 개별 또는 ZIP으로 일괄 다운로드"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="text-center bg-gray-50 rounded-2xl p-10">
        <h2 className="text-2xl font-bold mb-2">
          지금 바로 시작하세요
        </h2>
        <p className="text-gray-500 mb-6">
          놀공 계정으로 로그인하면 바로 사용할 수 있습니다.
        </p>
        <Link href={user ? "/translate" : "/login"}>
          <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition">
            {user ? "번역하러 가기 →" : "시작하기 →"}
          </button>
        </Link>
      </section>
    </div>
  )
}

function FeatureCard({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{num}</span>
      <h3 className="font-bold text-gray-900 mt-3 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  )
}
