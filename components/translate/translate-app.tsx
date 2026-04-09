"use client"

import { useState, useRef, useCallback } from "react"
import JSZip from "jszip"
import { saveAs } from "file-saver"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 타입 / 상수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface TextItem {
  text: string
  style: string
  headingLevel: number
  slideNum?: number
  file: string
}
interface Chunk {
  title: string
  texts: string[]
}
interface TranslationResult {
  name: string
  blob: Blob
  items: number
  translated: number
}

const CHUNK_MAX = 80
const CHUNK_CHARS = 8000

const LANGUAGES = [
  { value: "Russian", label: "러시아어 (Russian)" },
  { value: "English", label: "영어 (English)" },
  { value: "Japanese", label: "일본어 (Japanese)" },
  { value: "Chinese (Simplified)", label: "중국어 간체" },
  { value: "Chinese (Traditional)", label: "중국어 번체" },
  { value: "Spanish", label: "스페인어 (Spanish)" },
  { value: "French", label: "프랑스어 (French)" },
  { value: "German", label: "독일어 (German)" },
  { value: "Arabic", label: "아랍어 (Arabic)" },
  { value: "Vietnamese", label: "베트남어 (Vietnamese)" },
  { value: "Thai", label: "태국어 (Thai)" },
  { value: "Indonesian", label: "인도네시아어 (Indonesian)" },
  { value: "Portuguese", label: "포르투갈어 (Portuguese)" },
  { value: "Hindi", label: "힌디어 (Hindi)" },
  { value: "Mongolian", label: "몽골어 (Mongolian)" },
]

type Phase = "upload" | "progress" | "result"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function TranslateApp() {
  const [files, setFiles] = useState<File[]>([])
  const [lang, setLang] = useState("Russian")
  const [langs, setLangs] = useState(LANGUAGES)
  const [customLangOpen, setCustomLangOpen] = useState(false)
  const [customLang, setCustomLang] = useState("")
  const [phase, setPhase] = useState<Phase>("upload")
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState("")
  const [detailText, setDetailText] = useState("")
  const [sectionText, setSectionText] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const [batchStatus, setBatchStatus] = useState<{ icon: string; name: string; stat: string }[]>([])
  const [results, setResults] = useState<TranslationResult[]>([])
  const [errorMsg, setErrorMsg] = useState("")
  const [totalInfo, setTotalInfo] = useState({ ok: 0, fail: 0, translated: 0, elapsed: "" })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── 로그 ──
  const log = useCallback((msg: string) => {
    setLogs((prev) => [...prev, msg])
  }, [])

  // ── 파일 추가 ──
  const addFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase()
    if (!["docx", "pptx"].includes(ext || "")) {
      alert(`지원하지 않는 형식: ${f.name}\n지원: DOCX, PPTX`)
      return
    }
    setFiles((prev) => {
      if (prev.some((sf) => sf.name === f.name && sf.size === f.size)) return prev
      return [...prev, f]
    })
  }

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  const fmtSz = (b: number) => {
    if (b < 1024) return b + " B"
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB"
    return (b / 1048576).toFixed(1) + " MB"
  }

  // ── 커스텀 언어 ──
  const addCustomLang = () => {
    const val = customLang.trim()
    if (!val) return
    const exists = langs.find((l) => l.value.toLowerCase() === val.toLowerCase())
    if (exists) {
      setLang(exists.value)
    } else {
      setLangs((prev) => [...prev, { value: val, label: val }])
      setLang(val)
    }
    setCustomLang("")
    setCustomLangOpen(false)
  }

  // ── 드래그 & 드롭 ──
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    ;[...e.dataTransfer.files].forEach(addFile)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 번역 시작
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const startTranslation = async () => {
    if (!files.length) return
    setPhase("progress")
    setProgress(0)
    setLogs([])
    setResults([])
    setErrorMsg("")
    setBatchStatus(files.map((f) => ({ icon: "⏳", name: f.name, stat: "대기중" })))

    const startTime = Date.now()
    const isBatch = files.length > 1
    let totalTranslated = 0
    let totalFiles = 0
    let failedFiles = 0
    const newResults: TranslationResult[] = []

    for (let fi = 0; fi < files.length; fi++) {
      const file = files[fi]
      const ext = file.name.split(".").pop()?.toLowerCase() || ""

      setBatchStatus((prev) =>
        prev.map((b, i) => (i === fi ? { ...b, icon: "🔄", stat: "번역중..." } : b))
      )

      const overallBase = Math.floor((fi / files.length) * 100)
      const overallNext = Math.floor(((fi + 1) / files.length) * 100)

      log(`\n${"=".repeat(40)}`)
      log(`📄 [${fi + 1}/${files.length}] ${file.name}`)

      try {
        setStatusText(`[${fi + 1}/${files.length}] 파일 읽는 중...`)
        setProgress(overallBase + 1)

        const buf = await file.arrayBuffer()
        const zip = await JSZip.loadAsync(buf)
        log("✓ ZIP 로드")

        setStatusText(`[${fi + 1}/${files.length}] 텍스트 추출...`)
        setProgress(overallBase + 3)
        const items = ext === "docx" ? await extractDocx(zip) : await extractPptx(zip)
        log(`✓ ${items.length}개 항목 추출`)

        if (items.length === 0) {
          log("⚠ 텍스트 없음 — 건너뛰")
          setBatchStatus((prev) =>
            prev.map((b, i) => (i === fi ? { icon: "⚠️", name: b.name, stat: "텍스트 없음" } : b))
          )
          failedFiles++
          continue
        }

        const chunks = buildChunks(items)
        log(`✓ ${chunks.length}개 청크`)

        // 청크별 번역
        const mapping: Record<string, string> = {}
        for (let ci = 0; ci < chunks.length; ci++) {
          const ch = chunks[ci]
          const chunkPct = overallBase + 5 + Math.floor((ci / chunks.length) * (overallNext - overallBase - 10))
          setStatusText(`[${fi + 1}/${files.length}] 번역 중...`)
          setProgress(chunkPct)
          setDetailText(`파일 ${fi + 1}/${files.length} · 청크 ${ci + 1}/${chunks.length}\n${Object.keys(mapping).length}개 번역됨 (전체 ${items.length}개)`)
          setSectionText("📖 " + ch.title.slice(0, 50))
          log(`  📝 청크 [${ci + 1}/${chunks.length}] ${ch.title.slice(0, 35)} (${ch.texts.length}항목)`)

          const chMap = await translateChunk(ch.texts, lang)
          if (chMap) {
            Object.assign(mapping, chMap)
            log(`    ✓ ${Object.keys(chMap).length}개`)
          } else {
            log(`    ✗ 실패`)
          }
          if (ci < chunks.length - 1) await sleep(300)
        }

        totalTranslated += Object.keys(mapping).length

        // 스타일 보존 적용
        setStatusText(`[${fi + 1}/${files.length}] 스타일 적용...`)
        setProgress(overallNext - 3)
        if (ext === "docx") await applyDocx(zip, mapping)
        else await applyPptx(zip, mapping)

        const mimeType =
          ext === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        const blob = await zip.generateAsync({ type: "blob", mimeType })
        const outName = "translated_" + file.name
        newResults.push({ name: outName, blob, items: items.length, translated: Object.keys(mapping).length })
        totalFiles++
        log(`✅ 완료: ${outName}`)

        setBatchStatus((prev) =>
          prev.map((b, i) =>
            i === fi ? { icon: "✅", name: b.name, stat: `${Object.keys(mapping).length}개 번역` } : b
          )
        )
      } catch (e: any) {
        log(`❌ 오류: ${e.message}`)
        failedFiles++
        setBatchStatus((prev) =>
          prev.map((b, i) => (i === fi ? { icon: "❌", name: b.name, stat: "실패" } : b))
        )
        if (!isBatch) {
          setErrorMsg(e.message)
          setPhase("result")
          return
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    log(`\n${"=".repeat(40)}`)
    log(`🏁 전체 완료: ${totalFiles}개 성공, ${failedFiles}개 실패 (${elapsed}초)`)
    setProgress(100)
    setResults(newResults)
    setTotalInfo({ ok: totalFiles, fail: failedFiles, translated: totalTranslated, elapsed })
    setPhase("result")
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // API 호출 (서버 Route)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const translateChunk = async (
    texts: string[],
    targetLang: string
  ): Promise<Record<string, string> | null> => {
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts, lang: targetLang }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      return data.mapping
    } catch (e: any) {
      log(`    ⚠ API 오류: ${e.message}`)
      return null
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DOCX 추출
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const extractDocx = async (zip: JSZip): Promise<TextItem[]> => {
    const items: TextItem[] = []
    const xmlFiles = Object.keys(zip.files).filter(
      (n) =>
        (n.startsWith("word/document") ||
          n.startsWith("word/header") ||
          n.startsWith("word/footer") ||
          n === "word/footnotes.xml" ||
          n === "word/endnotes.xml") &&
        n.endsWith(".xml")
    )
    for (const fn of xmlFiles) {
      const xml = await zip.file(fn)!.async("string")
      const doc = new DOMParser().parseFromString(xml, "text/xml")
      const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
      const paras = doc.getElementsByTagNameNS(ns, "p")
      for (const p of Array.from(paras)) {
        let style = "Normal"
        let headingLevel = 0
        const pPr = p.getElementsByTagNameNS(ns, "pStyle")[0]
        if (pPr) {
          style = pPr.getAttribute("w:val") || "Normal"
          const hm = style.match(/Heading\s*(\d+)/i)
          if (hm) headingLevel = parseInt(hm[1])
        }
        const runs = p.getElementsByTagNameNS(ns, "r")
        let fullText = ""
        for (const r of Array.from(runs)) {
          const ts = r.getElementsByTagNameNS(ns, "t")
          for (const t of Array.from(ts)) fullText += t.textContent
        }
        fullText = fullText.trim()
        if (fullText) items.push({ text: fullText, style, headingLevel, file: fn })
      }
    }
    return items
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PPTX 추출
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const extractPptx = async (zip: JSZip): Promise<TextItem[]> => {
    const items: TextItem[] = []
    const slideFiles = Object.keys(zip.files)
      .filter((n) => n.match(/ppt\/slides\/slide\d+\.xml$/))
      .sort()
    for (const fn of slideFiles) {
      const slideNum = parseInt(fn.match(/slide(\d+)/)![1])
      const xml = await zip.file(fn)!.async("string")
      const doc = new DOMParser().parseFromString(xml, "text/xml")
      const nsA = "http://schemas.openxmlformats.org/drawingml/2006/main"
      const paras = doc.getElementsByTagNameNS(nsA, "p")
      for (const p of Array.from(paras)) {
        const runs = p.getElementsByTagNameNS(nsA, "r")
        let fullText = ""
        for (const r of Array.from(runs)) {
          const ts = r.getElementsByTagNameNS(nsA, "t")
          for (const t of Array.from(ts)) fullText += t.textContent
        }
        fullText = fullText.trim()
        if (fullText) items.push({ text: fullText, style: "slide_body", headingLevel: 0, slideNum, file: fn })
      }
    }
    // 노트
    const noteFiles = Object.keys(zip.files)
      .filter((n) => n.match(/ppt\/notesSlides\/notesSlide\d+\.xml$/))
      .sort()
    for (const fn of noteFiles) {
      const slideNum = parseInt(fn.match(/notesSlide(\d+)/)![1])
      const xml = await zip.file(fn)!.async("string")
      const doc = new DOMParser().parseFromString(xml, "text/xml")
      const ns = "http://schemas.openxmlformats.org/drawingml/2006/main"
      const paras = doc.getElementsByTagNameNS(ns, "p")
      for (const p of Array.from(paras)) {
        const runs = p.getElementsByTagNameNS(ns, "r")
        let fullText = ""
        for (const r of Array.from(runs)) {
          const ts = r.getElementsByTagNameNS(ns, "t")
          for (const t of Array.from(ts)) fullText += t.textContent
        }
        fullText = fullText.trim()
        if (fullText) items.push({ text: fullText, style: "slide_note", headingLevel: 0, slideNum, file: fn })
      }
    }
    return items
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 스마트 청킹
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const buildChunks = (items: TextItem[]): Chunk[] => {
    const bounds: number[] = []
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.headingLevel && it.headingLevel <= 2) bounds.push(i)
      else if (
        /^(제?\s*\d+\s*(단원|장|과|부)|Chapter\s+\d+|Unit\s+\d+|Part\s+\d+|Lesson\s+\d+|LESSON\s+\d+)/i.test(
          it.text
        )
      )
        bounds.push(i)
    }

    if (!bounds.length && items[0]?.slideNum) return buildSlideChunks(items)
    if (!bounds.length) bounds.push(0)
    else if (bounds[0] !== 0) bounds.unshift(0)

    const rawSecs: { title: string; items: TextItem[] }[] = []
    for (let i = 0; i < bounds.length; i++) {
      const start = bounds[i]
      const end = i + 1 < bounds.length ? bounds[i + 1] : items.length
      const secItems = items.slice(start, end)
      rawSecs.push({ title: secItems[0].text.slice(0, 60), items: secItems })
    }

    const chunks: Chunk[] = []
    for (const sec of rawSecs) {
      const chars = sec.items.reduce((s, it) => s + it.text.length, 0)
      if (sec.items.length <= CHUNK_MAX && chars <= CHUNK_CHARS) {
        chunks.push({ title: sec.title, texts: sec.items.map((i) => i.text) })
      } else {
        for (let fi = 0; fi < sec.items.length; fi += CHUNK_MAX) {
          const frag = sec.items.slice(fi, fi + CHUNK_MAX)
          chunks.push({
            title: `${sec.title} (part ${Math.floor(fi / CHUNK_MAX) + 1})`,
            texts: frag.map((i) => i.text),
          })
        }
      }
    }
    return chunks
  }

  const buildSlideChunks = (items: TextItem[]): Chunk[] => {
    const groups: Record<number, TextItem[]> = {}
    items.forEach((it) => {
      const sn = it.slideNum || 1
      ;(groups[sn] = groups[sn] || []).push(it)
    })
    const chunks: Chunk[] = []
    const nums = Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b)
    for (let i = 0; i < nums.length; i += 7) {
      const batch = nums.slice(i, i + 7)
      const texts = batch.flatMap((sn) => groups[sn].map((it) => it.text))
      chunks.push({ title: `Slides ${batch[0]}~${batch[batch.length - 1]}`, texts })
    }
    return chunks
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 적용 (스타일 보존)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const applyDocx = async (zip: JSZip, mapping: Record<string, string>) => {
    const xmlFiles = Object.keys(zip.files).filter(
      (n) =>
        (n.startsWith("word/document") ||
          n.startsWith("word/header") ||
          n.startsWith("word/footer") ||
          n === "word/footnotes.xml" ||
          n === "word/endnotes.xml") &&
        n.endsWith(".xml")
    )
    for (const fn of xmlFiles) {
      const xml = await zip.file(fn)!.async("string")
      const doc = new DOMParser().parseFromString(xml, "text/xml")
      const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
      let changed = false
      for (const p of Array.from(doc.getElementsByTagNameNS(ns, "p"))) {
        const runs = p.getElementsByTagNameNS(ns, "r")
        let ft = ""
        for (const r of Array.from(runs)) {
          const ts = r.getElementsByTagNameNS(ns, "t")
          for (const t of Array.from(ts)) ft += t.textContent
        }
        ft = ft.trim()
        if (!ft || !mapping[ft] || mapping[ft] === ft) continue
        let first = true
        for (const r of Array.from(runs)) {
          const ts = r.getElementsByTagNameNS(ns, "t")
          for (const t of Array.from(ts)) {
            if (first) {
              t.textContent = mapping[ft]
              t.setAttribute("xml:space", "preserve")
              first = false
            } else {
              t.textContent = ""
            }
          }
        }
        changed = true
      }
      if (changed) zip.file(fn, new XMLSerializer().serializeToString(doc))
    }
  }

  const applyPptx = async (zip: JSZip, mapping: Record<string, string>) => {
    const slideFiles = Object.keys(zip.files).filter(
      (n) => n.match(/ppt\/slides\/slide\d+\.xml$/) || n.match(/ppt\/notesSlides\/notesSlide\d+\.xml$/)
    )
    for (const fn of slideFiles) {
      const xml = await zip.file(fn)!.async("string")
      const doc = new DOMParser().parseFromString(xml, "text/xml")
      const ns = "http://schemas.openxmlformats.org/drawingml/2006/main"
      let changed = false
      for (const p of Array.from(doc.getElementsByTagNameNS(ns, "p"))) {
        const runs = p.getElementsByTagNameNS(ns, "r")
        let ft = ""
        for (const r of Array.from(runs)) {
          const ts = r.getElementsByTagNameNS(ns, "t")
          for (const t of Array.from(ts)) ft += t.textContent
        }
        ft = ft.trim()
        if (!ft || !mapping[ft] || mapping[ft] === ft) continue
        let first = true
        for (const r of Array.from(runs)) {
          const ts = r.getElementsByTagNameNS(ns, "t")
          for (const t of Array.from(ts)) {
            if (first) {
              t.textContent = mapping[ft]
              first = false
            } else {
              t.textContent = ""
            }
          }
        }
        changed = true
      }
      if (changed) zip.file(fn, new XMLSerializer().serializeToString(doc))
    }
  }

  // ── 다운로드 ──
  const downloadOne = (idx: number) => {
    const r = results[idx]
    if (r) saveAs(r.blob, r.name)
  }

  const downloadAll = async () => {
    if (results.length === 1) return downloadOne(0)
    const zip = new JSZip()
    for (const r of results) zip.file(r.name, r.blob)
    const blob = await zip.generateAsync({ type: "blob" })
    saveAs(blob, "translated_documents.zip")
  }

  const resetAll = () => {
    setFiles([])
    setPhase("upload")
    setProgress(0)
    setLogs([])
    setResults([])
    setErrorMsg("")
    setBatchStatus([])
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 렌더링
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="max-w-[700px] mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">문서 번역기</h1>
        <p className="text-gray-500 text-sm">DOCX · PPTX 문서를 원하는 언어로 번역</p>
        <span className="inline-block bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full mt-2">
          원본 스타일 100% 보존 · 대량 문서 지원
        </span>
      </div>

      {/* ── 업로드 + 설정 ── */}
      {phase === "upload" && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4 shadow-sm">
            {files.length === 0 ? (
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-9 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="text-4xl mb-2">📁</div>
                <p className="text-sm text-gray-500">
                  <strong className="text-blue-600">파일을 선택</strong>하거나 여기에 드래그하세요
                </p>
                <p className="text-xs text-gray-400 mt-1">DOCX, PPTX · 여러 파일 동시 선택 가능</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-green-50 rounded-lg px-3 py-2.5 text-sm">
                    <span>📄</span>
                    <span className="font-semibold flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-gray-400">{fmtSz(f.size)}</span>
                    <button onClick={() => removeFile(i)} className="text-red-500 text-sm">
                      ✕
                    </button>
                  </div>
                ))}
                <div className="text-center mt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 text-xs hover:underline"
                  >
                    + 파일 추가
                  </button>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pptx"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) [...e.target.files].forEach(addFile)
                e.target.value = ""
              }}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1">번역 언어</label>
              <div className="flex gap-2">
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  {langs.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setCustomLangOpen(!customLangOpen)}
                  className="w-10 h-10 border border-gray-200 rounded-lg text-blue-600 text-xl hover:bg-blue-50 transition flex items-center justify-center"
                  title="다른 언어 추가"
                >
                  +
                </button>
              </div>
              {customLangOpen && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={customLang}
                    onChange={(e) => setCustomLang(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomLang()}
                    placeholder="언어 이름 입력 (예: Swahili, Uzbek...)"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    autoFocus
                  />
                  <button
                    onClick={addCustomLang}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
                  >
                    추가
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={startTranslation}
              disabled={!files.length}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              번역 시작
            </button>
          </div>
        </>
      )}

      {/* ── 진행 ── */}
      {phase === "progress" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-sm">{statusText}</span>
            <span className="font-bold text-blue-600 text-lg">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-400"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 whitespace-pre-line">{detailText}</p>
          {sectionText && <p className="text-xs text-blue-600 font-medium mt-1 truncate">{sectionText}</p>}

          {batchStatus.length > 1 && (
            <div className="mt-4 space-y-0">
              {batchStatus.map((b, i) => (
                <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0 text-sm">
                  <span className="w-5 text-center">{b.icon}</span>
                  <span className="flex-1 truncate">{b.name}</span>
                  <span className="text-xs text-gray-400">{b.stat}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 max-h-28 overflow-y-auto bg-gray-50 rounded-lg p-2 font-mono text-[11px] text-gray-500 leading-relaxed">
            {logs.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── 결과 ── */}
      {phase === "result" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          {errorMsg ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
              ❌ 오류: {errorMsg}
              <button onClick={resetAll} className="block mt-3 text-blue-600 hover:underline text-sm">
                다시 시도 →
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-xl font-bold mb-2">번역 완료!</h2>
              <p className="text-gray-500 text-sm mb-1">
                <strong>{langs.find((l) => l.value === lang)?.label || lang}</strong>로 번역
              </p>
              <p className="text-gray-500 text-sm mb-4">
                {totalInfo.ok}개 파일 완료 · {totalInfo.translated}개 항목 · {totalInfo.elapsed}초
                {totalInfo.fail > 0 && <span className="text-red-500"> · {totalInfo.fail}개 실패</span>}
              </p>
              <span className="inline-block bg-amber-50 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                원본 스타일 보존됨
              </span>

              <div className="text-left space-y-2 mb-4">
                {results.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => downloadOne(i)}
                    className="flex items-center gap-3 bg-green-50 rounded-lg px-4 py-3 cursor-pointer hover:bg-green-100 transition"
                  >
                    <span className="text-lg">📥</span>
                    <span className="flex-1 text-sm font-semibold">{r.name}</span>
                    <span className="text-xs text-gray-400">
                      {r.translated}개 번역 · {fmtSz(r.blob.size)}
                    </span>
                  </div>
                ))}
              </div>

              {results.length > 1 && (
                <button
                  onClick={downloadAll}
                  className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition mb-3"
                >
                  📥 전체 다운로드 (ZIP)
                </button>
              )}

              <button onClick={resetAll} className="text-blue-600 text-sm hover:underline">
                새 문서 번역하기 →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
