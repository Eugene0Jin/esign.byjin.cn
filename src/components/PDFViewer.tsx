'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useStore } from '@/store/useStore'
import { getToolCursor } from '@/lib/toolCursor'
import { PDF_RENDER_SCALE } from '@/lib/pdfConstants'
import { formatDateValue } from '@/lib/date'
import Stamp from './Stamp'

const MIN_LOADING_VISIBLE_MS = 600

function waitForBrowserPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

export default function PDFViewer() {
  const { pdfFile, pdfPages, setPdfPages, stamps, setSelectedStampId, selectedTool, addStamp, showSignatureModal, showSealModal, setEditingStampId, checkmarkVariant, lastDateValue, lastDateFormat } = useStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const pageImageRefs = useRef<Array<HTMLImageElement | null>>([])
  const [pageScales, setPageScales] = useState<Record<number, number>>({})
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 })
  const [loadError, setLoadError] = useState('')
  const pageCursor = getToolCursor(selectedTool, checkmarkVariant)

  const updatePageScale = useCallback((pageIndex: number, image: HTMLImageElement) => {
    if (image.naturalWidth === 0) return

    const scale = image.getBoundingClientRect().width / image.naturalWidth
    if (!Number.isFinite(scale) || scale <= 0) return

    setPageScales((current) => {
      if (Math.abs((current[pageIndex] ?? 0) - scale) < 0.0001) return current
      return { ...current, [pageIndex]: scale }
    })
  }, [])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const image = entry.target as HTMLImageElement
        const pageIndex = Number(image.dataset.pageIndex)
        if (Number.isInteger(pageIndex)) updatePageScale(pageIndex, image)
      }
    })

    for (const image of pageImageRefs.current) {
      if (image) observer.observe(image)
    }

    return () => observer.disconnect()
  }, [pdfPages, updatePageScale])

  useEffect(() => {
    if (!pdfFile) return

    let cancelled = false
    let loadingTask: { destroy: () => Promise<void> } | null = null
    let renderTask: { cancel: () => void } | null = null

    const loadPdf = async () => {
      const loadingStartedAt = performance.now()

      try {
        // Let React commit and paint the loading UI before PDF parsing begins.
        await waitForBrowserPaint()
        if (cancelled) return

        const pdfjsLib = await import('pdfjs-dist')
        if (cancelled) return

        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

        const arrayBuffer = await pdfFile.arrayBuffer()
        if (cancelled) return

        const task = pdfjsLib.getDocument({ data: arrayBuffer })
        loadingTask = task
        const pdf = await task.promise
        if (cancelled) return

        setLoadingProgress({ loaded: 0, total: pdf.numPages })
        const pages: string[] = []

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          if (cancelled) return

          const viewport = page.getViewport({ scale: PDF_RENDER_SCALE })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Canvas is not available')

          canvas.height = viewport.height
          canvas.width = viewport.width

          const currentRenderTask = page.render({ canvasContext: context, viewport, canvas })
          renderTask = currentRenderTask
          await currentRenderTask.promise
          if (cancelled) return

          pages.push(canvas.toDataURL())
          setLoadingProgress({ loaded: i, total: pdf.numPages })

          // PDF rendering and data URL conversion can monopolize the main
          // thread. Yield a frame so progress and the spinner stay animated.
          await waitForBrowserPaint()
          if (cancelled) return
        }

        const remainingVisibleTime = MIN_LOADING_VISIBLE_MS - (performance.now() - loadingStartedAt)
        if (remainingVisibleTime > 0) await wait(remainingVisibleTime)

        if (!cancelled) setPdfPages(pages)
      } catch (error) {
        if (cancelled) return
        console.error('PDF loading failed:', error)
        setLoadError('We could not load this PDF. Please try another file.')
      }
    }

    loadPdf()

    return () => {
      cancelled = true
      renderTask?.cancel()
      void loadingTask?.destroy()
    }
  }, [pdfFile, setPdfPages])

  const handlePageClick = useCallback((e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
    e.stopPropagation()
    const target = e.target as HTMLElement
    if (target.closest('.stamp-element')) return

    const rect = e.currentTarget.getBoundingClientRect()
    const pageImage = pageImageRefs.current[pageIndex]
    const displayScale = pageImage?.naturalWidth
      ? pageImage.getBoundingClientRect().width / pageImage.naturalWidth
      : 1
    const x = (e.clientX - rect.left) / displayScale
    const y = (e.clientY - rect.top) / displayScale

    if (selectedTool === 'select') {
      setSelectedStampId(null)
      return
    }

    if (selectedTool === 'signature') {
      showSignatureModal(x, y, pageIndex)
      return
    }

    if (selectedTool === 'seal') {
      showSealModal(x, y, pageIndex)
      return
    }

    if (selectedTool === 'text') {
      const id = `text-${Date.now()}`
      addStamp({
        id,
        type: 'text',
        x: x - 50,
        y: y - 12,
        width: 100,
        height: 24,
        content: '',
        pageIndex,
      })
      setSelectedStampId(id)
      setEditingStampId(id)
      return
    }

    if (selectedTool === 'date') {
      const id = `date-${Date.now()}`
      const width = lastDateFormat === 'YYYY年MM月DD日' ? 120 : 100
      addStamp({
        id,
        type: 'date',
        x: x - width / 2,
        y: y - 12,
        width,
        height: 24,
        content: formatDateValue(lastDateValue, lastDateFormat),
        dateValue: lastDateValue,
        dateFormat: lastDateFormat,
        pageIndex,
      })
      setSelectedStampId(id)
      return
    }

    if (selectedTool === 'checkmark') {
      const symbol = checkmarkVariant === 'square' ? '■' : '✓'
      addStamp({
        id: `checkmark-${Date.now()}`,
        type: 'checkmark',
        x: x - 12,
        y: y - 12,
        width: 24,
        height: 24,
        content: symbol,
        pageIndex,
      })
      return
    }
  }, [selectedTool, setSelectedStampId, addStamp, showSignatureModal, showSealModal, setEditingStampId, checkmarkVariant, lastDateValue, lastDateFormat])

  if (pdfPages.length === 0) {
    if (loadError) {
      return (
        <div className="flex min-h-[55vh] items-center justify-center" role="alert">
          <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white px-6 py-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M12 9v4m0 4h.01M10.3 3.7 2.6 17a2 2 0 0 0 1.73 3h15.34a2 2 0 0 0 1.73-3L13.7 3.7a2 2 0 0 0-3.4 0Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="mt-4 text-base font-semibold text-gray-900">Unable to load document</h2>
            <p className="mt-2 text-sm text-gray-500">{loadError}</p>
          </div>
        </div>
      )
    }

    const progress = loadingProgress.total > 0
      ? Math.max(8, Math.round((loadingProgress.loaded / loadingProgress.total) * 100))
      : 8
    const loadingMessage = loadingProgress.total > 0
      ? `Rendering page ${Math.min(loadingProgress.loaded + 1, loadingProgress.total)} of ${loadingProgress.total}`
      : 'Reading document…'

    return (
      <div className="flex min-h-[55vh] items-center justify-center" role="status" aria-live="polite">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center shadow-sm">
          <div className="relative mx-auto h-24 w-20" aria-hidden="true">
            <div className="absolute inset-0 animate-pulse rounded-lg border border-gray-200 bg-gray-50 shadow-sm" />
            <div className="absolute left-3 right-3 top-4 space-y-2">
              <span className="block h-2 rounded-full bg-gray-200" />
              <span className="block h-2 w-4/5 rounded-full bg-gray-200" />
              <span className="block h-2 w-2/3 rounded-full bg-gray-200" />
            </div>
            <div className="absolute -bottom-2 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 shadow-lg shadow-blue-200">
              <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-30" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-100" d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <h2 className="mt-6 text-base font-semibold text-gray-900">Loading your PDF</h2>
          <p className="mt-1.5 text-sm text-gray-500">{loadingMessage}</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
            <div
              className="h-full rounded-full bg-blue-600 transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
            <span>Larger files may take a moment</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4">
      {pdfPages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          className="relative bg-white shadow-lg"
          onClick={(e) => handlePageClick(e, pageIndex)}
          style={{ cursor: pageCursor }}
        >
          {/* PDF pages are generated in-browser as data URLs. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={(image) => { pageImageRefs.current[pageIndex] = image }}
            src={page}
            alt={`Page ${pageIndex + 1}`}
            className="block"
            data-page-index={pageIndex}
            onLoad={(event) => updatePageScale(pageIndex, event.currentTarget)}
            draggable={false}
          />
          {stamps
            .filter((stamp) => stamp.pageIndex === pageIndex)
            .map((stamp) => (
              <Stamp key={stamp.id} stamp={stamp} scale={pageScales[pageIndex] ?? 1} />
            ))}
        </div>
      ))}
    </div>
  )
}
