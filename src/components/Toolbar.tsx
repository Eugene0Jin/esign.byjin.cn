'use client'

import { ReactNode } from 'react'
import { useStore, Tool, CheckmarkVariant } from '@/store/useStore'

const tools: { id: Tool; label: string; icon: ReactNode }[] = [
  {
    id: 'select',
    label: 'Select',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      </svg>
    ),
  },
  {
    id: 'signature',
    label: 'Signature',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 1024 1024" aria-hidden="true">
        <path d="M689.9712 372.40832l74.71104-74.17856-75.85792-75.32544-74.71104 74.1376 75.85792 75.3664z m-47.06304 46.6944l-75.85792-75.32544-334.0288 331.5712c-13.9264 13.80352-31.29344 45.91616-35.26656 65.20832l-11.75552 56.81152 57.26208-11.6736c19.61984-4.01408 51.56864-21.0944 65.65888-35.06176l333.98784-331.53024z m6.22592-237.64992c10.48576-10.52672 24.7808-16.42496 39.69024-16.42496 14.90944 0 29.20448 5.89824 39.69024 16.42496l77.98784 77.37344a55.5008 55.5008 0 0 1 0 78.848L349.67552 791.1424c-21.9136 21.74976-63.97952 44.35968-94.8224 50.62656l-85.72928 17.44896c-12.65664 2.58048-25.76384-1.31072-34.89792-10.40384a38.01088 38.01088 0 0 1-10.48576-34.65216L141.312 729.088c6.22592-30.22848 29.04064-72.41728 50.9952-94.16704L649.13408 181.4528z m124.1088 543.41632c-4.38272 26.54208-20.76672 50.50368-46.61248 69.34528 53.0432 3.39968 93.26592-14.09024 123.41248-52.34688 9.6256-12.16512 27.32032-14.336 39.69024-4.9152 12.32896 9.46176 14.58176 26.95168 4.99712 39.1168-51.77344 65.65888-127.34464 87.73632-221.47072 66.39616a159.70304 159.70304 0 0 1-34.24256-11.79648c-78.56128 19.53792-150.44608 29.2864-215.57248 29.2864-7.49568 0.04096-14.66368-2.90816-19.94752-8.11008a27.705344 27.705344 0 0 1-8.31488-19.78368c0.08192-15.44192 12.73856-27.93472 28.30336-27.89376 50.25792 0 105.472-6.38976 165.60128-19.21024-11.14112-20.64384-14.17216-44.81024-8.3968-70.0416 12.20608-53.16608 60.6208-93.34784 113.95072-85.72928 53.12512 7.70048 86.54848 48.16896 78.60224 95.68256z m-137.46176 2.4576c-3.85024 16.91648-0.12288 31.9488 12.36992 43.29472 81.42848-24.33024 88.96512-78.88896 38.25664-86.17984-21.42208-3.03104-44.4416 16.09728-50.62656 42.88512z m0 0" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'seal',
    label: 'Seal',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
        <circle cx="12" cy="12" r="6.5" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8.4l1 2 2.2.3-1.6 1.6.4 2.2-2-1-2 1 .4-2.2-1.6-1.6 2.2-.3 1-2z" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
      </svg>
    ),
  },
  {
    id: 'date',
    label: 'Date',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'checkmark',
    label: 'Checkmark',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
]

const checkmarkVariants: { id: CheckmarkVariant; label: string; symbol: string }[] = [
  { id: 'square', label: 'Square', symbol: '■' },
  { id: 'check', label: 'Check', symbol: '✓' },
]

export default function Toolbar() {
  const { selectedTool, setSelectedTool, pdfFile, checkmarkVariant, setCheckmarkVariant } = useStore()

  if (!pdfFile) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
      {selectedTool === 'checkmark' && (
        <div className="bg-white rounded-full shadow-lg border border-gray-200 px-2 py-1 flex items-center gap-1">
          {checkmarkVariants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => setCheckmarkVariant(variant.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                checkmarkVariant === variant.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">{variant.symbol}</span>
              {variant.label}
            </button>
          ))}
        </div>
      )}
      <div className="max-w-[calc(100vw-2rem)] overflow-x-auto bg-white rounded-full shadow-lg border border-gray-200 px-2 py-2 flex items-center gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(tool.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedTool === tool.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tool.icon}
            {tool.label}
          </button>
        ))}
      </div>
    </div>
  )
}
