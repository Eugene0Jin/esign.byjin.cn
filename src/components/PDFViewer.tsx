'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useStore } from '@/store/useStore'
import { getToolCursor } from '@/lib/toolCursor'
import { PDF_RENDER_SCALE } from '@/lib/pdfConstants'
import Stamp from './Stamp'

export default function PDFViewer() {
  const { pdfFile, pdfPages, setPdfPages, stamps, setSelectedStampId, selectedTool, addStamp, showSignatureModal, showSealModal, setEditingStampId, checkmarkVariant } = useStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const pageImageRefs = useRef<Array<HTMLImageElement | null>>([])
  const [pageScales, setPageScales] = useState<Record<number, number>>({})
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

    const loadPdf = async () => {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

      const arrayBuffer = await pdfFile.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const pages: string[] = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: PDF_RENDER_SCALE })

        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')!
        canvas.height = viewport.height
        canvas.width = viewport.width

        await page.render({ canvasContext: context, viewport, canvas }).promise
        pages.push(canvas.toDataURL())
      }

      setPdfPages(pages)
    }

    loadPdf()
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
      const today = new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })
      addStamp({
        id: `date-${Date.now()}`,
        type: 'date',
        x: x - 50,
        y: y - 12,
        width: 100,
        height: 24,
        content: today,
        pageIndex,
      })
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
  }, [selectedTool, setSelectedStampId, addStamp, showSignatureModal, showSealModal, setEditingStampId, checkmarkVariant])

  if (pdfPages.length === 0) return null

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4">
      {pdfPages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          className="relative bg-white shadow-lg"
          onClick={(e) => handlePageClick(e, pageIndex)}
          style={{ cursor: pageCursor }}
        >
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
