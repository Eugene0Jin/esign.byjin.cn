'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { useStore } from '@/store/useStore'
import type { SignatureMode } from '@/lib/signature'

const SIGNATURE_FONTS = [
  { name: 'Dancing Script', family: "'Dancing Script', cursive" },
  { name: 'Great Vibes', family: "'Great Vibes', cursive" },
  { name: 'Pacifico', family: "'Pacifico', cursive" },
  { name: 'Caveat', family: "'Caveat', cursive" },
  { name: 'Sacramento', family: "'Sacramento', cursive" },
]

type Tab = SignatureMode

export default function SignatureModal() {
  const {
    signatureModal,
    hideSignatureModal,
    addStamp,
    savedSignature,
    saveSignature,
    clearSavedSignature,
  } = useStore()
  const [activeTab, setActiveTab] = useState<Tab>('draw')
  const [typedName, setTypedName] = useState('')
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0])
  const [restoredContent, setRestoredContent] = useState<string | null>(null)
  const sigCanvasRef = useRef<SignatureCanvas>(null)

  useEffect(() => {
    // Load Google Fonts
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script&family=Great+Vibes&family=Pacifico&family=Caveat&family=Sacramento&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }, [])

  useEffect(() => {
    if (!signatureModal.visible) return

    let canvasFrame = 0
    const stateFrame = requestAnimationFrame(() => {
      const restoredFont = SIGNATURE_FONTS.find((font) => font.name === savedSignature?.fontName)
        ?? SIGNATURE_FONTS[0]

      setActiveTab(savedSignature?.mode ?? 'draw')
      setTypedName(savedSignature?.typedName ?? '')
      setSelectedFont(restoredFont)
      setRestoredContent(savedSignature?.content ?? null)

      canvasFrame = requestAnimationFrame(() => {
        sigCanvasRef.current?.clear()
        if (savedSignature?.mode === 'draw') {
          sigCanvasRef.current?.fromDataURL(savedSignature.content)
        }
      })
    })

    return () => {
      cancelAnimationFrame(stateFrame)
      cancelAnimationFrame(canvasFrame)
    }
  }, [savedSignature, signatureModal.visible])

  const handleClear = useCallback(() => {
    sigCanvasRef.current?.clear()
    setRestoredContent(null)
  }, [])

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab)
    setRestoredContent(null)
  }, [])

  const handleClearSavedSignature = useCallback(() => {
    clearSavedSignature()
    setActiveTab('draw')
    setTypedName('')
    setSelectedFont(SIGNATURE_FONTS[0])
    setRestoredContent(null)
    requestAnimationFrame(() => sigCanvasRef.current?.clear())
  }, [clearSavedSignature])

  const createSignatureFromCanvas = useCallback(() => {
    if (!sigCanvasRef.current?.isEmpty()) {
      const dataUrl = sigCanvasRef.current!.toDataURL('image/png')
      return dataUrl
    }
    return null
  }, [])

  const createSignatureFromText = useCallback((text: string, fontFamily: string) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 300
    canvas.height = 100
    ctx.font = `48px ${fontFamily}`
    ctx.fillStyle = '#000'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 150, 50)
    return canvas.toDataURL('image/png')
  }, [])

  const handleSave = useCallback(() => {
    let dataUrl: string | null = restoredContent

    if (!dataUrl && activeTab === 'draw') {
      dataUrl = createSignatureFromCanvas()
    } else if (!dataUrl && activeTab === 'type' && typedName.trim()) {
      dataUrl = createSignatureFromText(typedName, selectedFont.family)
    } else if (!dataUrl && activeTab === 'fonts' && typedName.trim()) {
      dataUrl = createSignatureFromText(typedName, selectedFont.family)
    }

    if (dataUrl) {
      const id = `sig-${Date.now()}`
      addStamp({
        id,
        type: 'signature',
        x: signatureModal.x - 75,
        y: signatureModal.y - 25,
        width: 150,
        height: 50,
        content: dataUrl,
        pageIndex: signatureModal.pageIndex,
      })
      saveSignature({
        mode: activeTab,
        content: dataUrl,
        typedName,
        fontName: selectedFont.name,
      })
    }

    hideSignatureModal()
  }, [activeTab, typedName, selectedFont, restoredContent, createSignatureFromCanvas, createSignatureFromText, addStamp, saveSignature, signatureModal, hideSignatureModal])

  if (!signatureModal.visible) return null

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex border-b">
          <button
            onClick={() => handleTabChange('draw')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'draw' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
          >
            Draw
          </button>
          <button
            onClick={() => handleTabChange('type')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'type' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
          >
            Type
          </button>
          <button
            onClick={() => handleTabChange('fonts')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'fonts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
          >
            Fonts
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'draw' && (
            <div>
              <div className="border rounded-lg bg-gray-50 mb-3">
                <SignatureCanvas
                  ref={sigCanvasRef}
                  canvasProps={{
                    className: 'w-full h-32 rounded-lg',
                    style: { width: '100%', height: '128px' },
                  }}
                  penColor="black"
                  onEnd={() => setRestoredContent(null)}
                />
              </div>
              <button
                onClick={handleClear}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          )}

          {activeTab === 'type' && (
            <div>
              <input
                type="text"
                value={typedName}
                onChange={(e) => {
                  setTypedName(e.target.value)
                  setRestoredContent(null)
                }}
                placeholder="Type your name"
                className="w-full border rounded-lg px-4 py-3 mb-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div
                className="h-20 border rounded-lg bg-gray-50 flex items-center justify-center"
                style={{ fontFamily: selectedFont.family, fontSize: '32px' }}
              >
                {typedName || 'Preview'}
              </div>
            </div>
          )}

          {activeTab === 'fonts' && (
            <div>
              <input
                type="text"
                value={typedName}
                onChange={(e) => {
                  setTypedName(e.target.value)
                  setRestoredContent(null)
                }}
                placeholder="Type your name"
                className="w-full border rounded-lg px-4 py-3 mb-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {SIGNATURE_FONTS.map((font) => (
                  <button
                    key={font.name}
                  onClick={() => {
                    setSelectedFont(font)
                    setRestoredContent(null)
                  }}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      selectedFont.name === font.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span style={{ fontFamily: font.family, fontSize: '24px' }}>
                      {typedName || font.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t p-4 sm:flex-row sm:items-center">
          <div className="sm:mr-auto">
            {savedSignature && (
              <button
                type="button"
                onClick={handleClearSavedSignature}
                className="w-full rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 sm:w-auto"
              >
                Clear
              </button>
            )}
          </div>
          <button
            onClick={hideSignatureModal}
            className="rounded-lg px-5 py-2 text-gray-600 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-5 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Add Signature
          </button>
        </div>
      </div>
    </div>
  )
}
