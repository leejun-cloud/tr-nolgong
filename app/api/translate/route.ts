import { NextRequest, NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = "gemini-2.0-flash"

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "서버에 Gemini API 키가 설정되지 않았습니다." }, { status: 500 })
  }

  try {
    const { texts, lang } = await req.json()

    if (!texts || !Array.isArray(texts) || !lang) {
      return NextResponse.json({ error: "texts(배열)와 lang(문자열)이 필요합니다." }, { status: 400 })
    }

    const prompt = `당신은 교육 교재 전문 번역가입니다.
아래 JSON 배열의 문자열들을 **${lang}**(으)로 번역하십시오.

━━━ 번역 프로세스 ━━━
Step 1. 문맥 파악  Step 2. 초안 생성  Step 3. 자가 검토

━━━ 출력 규칙 ━━━
1. 원문과 **정확히 동일한 개수**의 JSON 배열 출력.
2. 1:1 대응 (순서, 개수 동일).
3. **오직 JSON 배열만** 출력 (설명, 마크다운, 주석 없이).
4. 숫자만의 항목, 기호, 약어(DNL 등)는 그대로 유지.

━━━ 원문 ━━━
${JSON.stringify(texts)}`

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

    let lastError = ""
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(`API ${res.status}: ${err?.error?.message || res.statusText}`)
        }

        const data = await res.json()
        let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
        raw = raw.trim()

        // JSON 파싱: \`\`\`json 블록 제거
        if (raw.includes("\`\`\`json")) raw = raw.split("\`\`\`json")[1].split("\`\`\`")[0].trim()
        else if (raw.includes("\`\`\`")) raw = raw.split("\`\`\`")[1].split("\`\`\`")[0].trim()

        const translated = JSON.parse(raw)
        if (!Array.isArray(translated)) throw new Error("not array")

        // 원문과 번역 매핑
        const mapping: Record<string, string> = {}
        for (let i = 0; i < Math.min(texts.length, translated.length); i++) {
          mapping[texts[i]] = translated[i]
        }

        return NextResponse.json({ mapping, count: Object.keys(mapping).length })
      } catch (e: any) {
        lastError = e.message
        if (attempt < 2) await new Promise((r) => setTimeout(r, 2000))
      }
    }

    return NextResponse.json({ error: `번역 실패 (3회 시도): ${lastError}` }, { status: 502 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
