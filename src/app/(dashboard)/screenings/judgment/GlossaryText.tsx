"use client"

import { useState, useRef, useEffect } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

type Segment = { type: "text"; content: string } | { type: "term"; content: string; key: string }

/**
 * glossary のキーを長い順にソート（長い一致を優先）
 */
function sortGlossaryKeys(glossary: Record<string, string>): string[] {
  return Object.keys(glossary).filter(Boolean).sort((a, b) => b.length - a.length)
}

/**
 * テキストを glossary のキーワードで分割してセグメント配列を返す
 */
function parseWithGlossary(text: string, glossary: Record<string, string>): Segment[] {
  const keys = sortGlossaryKeys(glossary)
  if (keys.length === 0) return [{ type: "text", content: text }]

  const segments: Segment[] = []
  let remaining = text

  while (remaining.length > 0) {
    let found = false
    for (const key of keys) {
      const idx = remaining.indexOf(key)
      if (idx === -1) continue
      if (idx > 0) {
        segments.push({ type: "text", content: remaining.slice(0, idx) })
      }
      segments.push({ type: "term", content: key, key })
      remaining = remaining.slice(idx + key.length)
      found = true
      break
    }
    if (!found) {
      segments.push({ type: "text", content: remaining })
      break
    }
  }

  return segments
}

type Props = {
  text: string
  glossary?: Record<string, string> | null
  className?: string
  /** ヒント用の小さいフォントなど */
  variant?: "default" | "hint"
}

export function GlossaryText({ text, glossary, className = "", variant = "default" }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const containerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openKey && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenKey(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [openKey])

  if (!glossary || Object.keys(glossary).length === 0) {
    return <span className={className}>{text}</span>
  }

  const segments = parseWithGlossary(text, glossary)

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={0}>
      <span ref={containerRef} className={className}>
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            return <span key={i}>{seg.content}</span>
          }
          const definition = glossary[seg.key]
          if (!definition) return <span key={i}>{seg.content}</span>

          const isOpen = openKey === seg.key
          return (
            <Tooltip key={i} open={isOpen} onOpenChange={(open) => setOpenKey(open ? seg.key : null)}>
              <TooltipTrigger asChild>
                <span
                  role="button"
                  tabIndex={0}
                  className="cursor-help underline decoration-dashed decoration-amber-500 underline-offset-2 hover:decoration-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 rounded px-0.5"
                  onClick={(e) => {
                    e.preventDefault()
                    setOpenKey((k) => (k === seg.key ? null : seg.key))
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setOpenKey((k) => (k === seg.key ? null : seg.key))
                    }
                  }}
                >
                  {seg.content}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className="max-w-[280px] bg-slate-800 text-slate-100 text-left text-sm leading-relaxed shadow-lg sm:max-w-[320px]"
              >
                <p className="font-medium text-slate-200 mb-1">{seg.content}</p>
                <p>{definition}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </span>
    </TooltipProvider>
  )
}
