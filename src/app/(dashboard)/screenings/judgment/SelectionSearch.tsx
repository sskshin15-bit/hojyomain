"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type PopupState = { text: string; x: number; y: number }

const SEARCH_URL = "https://www.google.com/search?q="

type Props = {
  children: React.ReactNode
}

export function SelectionSearch({ children }: Props) {
  const [popup, setPopup] = useState<PopupState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const clearSelection = useCallback(() => {
    setPopup(null)
    if (typeof window !== "undefined" && window.getSelection) {
      window.getSelection()?.removeAllRanges()
    }
  }, [])

  const handleSearch = useCallback(
    (text: string) => {
      window.open(SEARCH_URL + encodeURIComponent(text), "_blank", "noopener,noreferrer")
      clearSelection()
    },
    [clearSelection]
  )

  const handleMouseUp = useCallback(() => {
    if (typeof window === "undefined" || !window.getSelection || !containerRef.current) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const text = sel.toString().trim()
    if (!text) return
    const anchor = sel.anchorNode
    if (!anchor || !containerRef.current.contains(anchor)) return
    try {
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      setPopup({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      })
    } catch {
      setPopup(null)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popup && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement
        if (!target.closest("[data-selection-search-popover]")) setPopup(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [popup])

  return (
    <div ref={containerRef} onMouseUp={handleMouseUp} onTouchEnd={handleMouseUp}>
      {children}
      {popup &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-selection-search-popover
            className="fixed z-[100] flex -translate-x-1/2 -translate-y-full flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg"
            style={{ left: popup.x, top: popup.y }}
          >
            <p className="text-xs text-slate-500">「{popup.text}」を検索</p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={() => handleSearch(popup.text)}
              >
                <Search className="h-3.5 w-3.5" />
                ウェブで検索
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={clearSelection}
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
