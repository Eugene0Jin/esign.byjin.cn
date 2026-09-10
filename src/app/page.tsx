'use client'

import { useCallback, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import PDFUploader from '@/components/PDFUploader'
import PDFViewer from '@/components/PDFViewer'
import Toolbar from '@/components/Toolbar'
import SignatureModal from '@/components/SignatureModal'
import SealModal from '@/components/SealModal'
import DateModal from '@/components/DateModal'
import { exportPdf, downloadPdf } from '@/lib/pdfExport'

export default function Home() {
  const { pdfFile, pdfPages, stamps, reset, undo, redo } = useStore()

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
    reset()
  }, [reset])

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Free eSign</h1>
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

      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
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

      {/* Signature Modal */}
      <SignatureModal />

      {/* Seal Modal */}
      <SealModal />

      {/* Date Modal */}
      <DateModal />
    </div>
  )
}
