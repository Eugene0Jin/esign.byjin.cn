'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useStore, type PdfPageSize, type Stamp } from '@/store/useStore'
import PDFUploader from '@/components/PDFUploader'
import PDFViewer from '@/components/PDFViewer'
import Toolbar from '@/components/Toolbar'
import SignatureModal from '@/components/SignatureModal'
import SealModal from '@/components/SealModal'
import DateModal from '@/components/DateModal'
import { exportPdf, downloadPdf } from '@/lib/pdfExport'

const PAGE_BOUNDS_TOLERANCE = 0.5

function isStampOutsidePage(stamp: Stamp, pageSize: PdfPageSize | undefined): boolean {
  if (!pageSize) return false

  const rotation = stamp.type === 'seal' ? (stamp.rotation ?? 0) * Math.PI / 180 : 0
  const rotatedWidth = Math.abs(stamp.width * Math.cos(rotation)) + Math.abs(stamp.height * Math.sin(rotation))
  const rotatedHeight = Math.abs(stamp.width * Math.sin(rotation)) + Math.abs(stamp.height * Math.cos(rotation))
  const centerX = stamp.x + stamp.width / 2
  const centerY = stamp.y + stamp.height / 2
  const left = centerX - rotatedWidth / 2
  const right = centerX + rotatedWidth / 2
  const top = centerY - rotatedHeight / 2
  const bottom = centerY + rotatedHeight / 2

  return (
    left < -PAGE_BOUNDS_TOLERANCE ||
    top < -PAGE_BOUNDS_TOLERANCE ||
    right > pageSize.width + PAGE_BOUNDS_TOLERANCE ||
    bottom > pageSize.height + PAGE_BOUNDS_TOLERANCE
  )
}

export default function Home() {
  const { pdfFile, pdfPages, pdfPageSizes, stamps, reset, undo, redo } = useStore()
  const [sealToolUnlocked, setSealToolUnlocked] = useState(false)
  const [isHoldingLogo, setIsHoldingLogo] = useState(false)
  const sealUnlockTimerRef = useRef<number | null>(null)
  const hasOutOfBoundsContent = useMemo(
    () => stamps.some((stamp) => isStampOutsidePage(stamp, pdfPageSizes[stamp.pageIndex])),
    [pdfPageSizes, stamps]
  )

  const cancelSealUnlock = useCallback(() => {
    if (sealUnlockTimerRef.current !== null) {
      window.clearTimeout(sealUnlockTimerRef.current)
      sealUnlockTimerRef.current = null
    }
    setIsHoldingLogo(false)
  }, [])

  const handleLogoPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!pdfFile || sealToolUnlocked || (event.pointerType === 'mouse' && event.button !== 0)) return

    event.preventDefault()
    cancelSealUnlock()
    setIsHoldingLogo(true)
    sealUnlockTimerRef.current = window.setTimeout(() => {
      sealUnlockTimerRef.current = null
      setIsHoldingLogo(false)
      setSealToolUnlocked(true)
    }, 3000)
  }, [cancelSealUnlock, pdfFile, sealToolUnlocked])

  useEffect(() => {
    return cancelSealUnlock
  }, [cancelSealUnlock])

  // Warn before closing if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (stamps.length > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [stamps.length])

  // Undo/Redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  const handleExport = useCallback(async () => {
    if (!pdfFile || stamps.length === 0) return

    try {
      const blob = await exportPdf(pdfFile, stamps, pdfPages)
      const filename = pdfFile.name.replace('.pdf', '_signed.pdf')
      downloadPdf(blob, filename)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }, [pdfFile, stamps, pdfPages])

  const handleReset = useCallback(() => {
    cancelSealUnlock()
    setSealToolUnlocked(false)
    reset()
  }, [cancelSealUnlock, reset])

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      {/* Header and document warning */}
      <div className="sticky top-0 z-30">
        <header className="border-b border-gray-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              <button
                type="button"
                onPointerDown={handleLogoPointerDown}
                onPointerUp={cancelSealUnlock}
                onPointerLeave={cancelSealUnlock}
                onPointerCancel={cancelSealUnlock}
                onContextMenu={(event) => {
                  if (pdfFile && !sealToolUnlocked) event.preventDefault()
                }}
                className="relative select-none rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                style={{ touchAction: 'manipulation' }}
                aria-label="Free eSign"
              >
                Free eSign
                <span
                  className={`absolute -bottom-1 left-0 h-0.5 bg-blue-600 transition-[width] ease-linear ${
                    isHoldingLogo ? 'w-full' : 'w-0'
                  }`}
                  style={{ transitionDuration: isHoldingLogo ? '3000ms' : '150ms' }}
                  aria-hidden="true"
                />
              </button>
            </h1>
            {pdfFile && (
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  New Document
                </button>
                <button
                  onClick={handleExport}
                  disabled={stamps.length === 0}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Download PDF
                </button>
              </div>
            )}
          </div>
        </header>

        {pdfFile && hasOutOfBoundsContent && (
          <div
            className="border-b border-amber-200 bg-amber-50/95 px-4 py-2 text-amber-800 shadow-sm backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 text-center text-xs sm:text-sm">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M12 9v4m0 4h.01M10.3 3.7 2.6 17a2 2 0 0 0 1.73 3h15.34a2 2 0 0 0 1.73-3L13.7 3.7a2 2 0 0 0-3.4 0Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Content outside the page will not appear in the downloaded PDF.</span>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <Toolbar sealEnabled={sealToolUnlocked} />

      {/* Main Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {!pdfFile ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <PDFUploader />
            <p className="mt-6 text-gray-500 text-sm">
              Your documents stay private — everything happens in your browser
            </p>
          </div>
        ) : (
          <div className="pdf-page-container">
            <PDFViewer />
          </div>
        )}
      </main>

      {!pdfFile && (
        <footer>
          <div className="mx-auto max-w-5xl px-4 pb-4 text-center">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs tracking-wide text-gray-400 transition-colors hover:text-gray-600 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              湘ICP备2026039387号
            </a>
          </div>
        </footer>
      )}

      {/* Signature Modal */}
      <SignatureModal />

      {/* Seal Modal */}
      <SealModal />

      {/* Date Modal */}
      <DateModal />
    </div>
  )
}
