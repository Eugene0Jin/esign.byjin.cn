'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore, type Stamp } from '@/store/useStore'
import {
  DATE_FORMAT_OPTIONS,
  DEFAULT_DATE_FORMAT,
  formatDateValue,
  getTodayDateValue,
  normalizeDateValue,
  parseDisplayDate,
  type DateFormat,
} from '@/lib/date'

interface DateEditorProps {
  stamp: Stamp
  fallbackDateValue: string
  fallbackDateFormat: DateFormat
}

function DateEditor({ stamp, fallbackDateValue, fallbackDateFormat }: DateEditorProps) {
  const { hideDateModal, updateStamp, setLastDateValue, setLastDateFormat } = useStore()
  const parsedContent = useMemo(() => parseDisplayDate(stamp.content), [stamp.content])
  const initialDateValue = useMemo(() => (
    normalizeDateValue(stamp.dateValue)
      ?? parsedContent?.value
      ?? normalizeDateValue(fallbackDateValue)
      ?? getTodayDateValue()
  ), [fallbackDateValue, parsedContent, stamp.dateValue])
  const initialDateFormat = stamp.dateFormat
    ?? parsedContent?.format
    ?? fallbackDateFormat
    ?? DEFAULT_DATE_FORMAT
  const [dateValue, setDateValue] = useState(initialDateValue)
  const [dateFormat, setDateFormat] = useState<DateFormat>(initialDateFormat)
  const validDateValue = normalizeDateValue(dateValue)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hideDateModal()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hideDateModal])

  const handleSave = useCallback(() => {
    const normalized = normalizeDateValue(dateValue)
    if (!normalized) return

    const minimumWidth = dateFormat === 'YYYY年MM月DD日' ? 120 : stamp.width
    const nextWidth = Math.max(stamp.width, minimumWidth)

    updateStamp(stamp.id, {
      content: formatDateValue(normalized, dateFormat),
      dateValue: normalized,
      dateFormat,
      x: stamp.x - (nextWidth - stamp.width) / 2,
      width: nextWidth,
    })
    setLastDateValue(normalized)
    setLastDateFormat(dateFormat)
    hideDateModal()
  }, [dateFormat, dateValue, hideDateModal, setLastDateFormat, setLastDateValue, stamp.id, stamp.width, stamp.x, updateStamp])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="date-modal-title"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 id="date-modal-title" className="text-lg font-semibold text-gray-900">Edit date</h2>
            <p className="mt-1 text-sm text-gray-500">Choose any past or future date.</p>
          </div>
          <button
            type="button"
            onClick={hideDateModal}
            className="ml-4 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close date editor"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="p-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-900">Date</span>
            <input
              type="date"
              value={dateValue}
              onChange={(event) => setDateValue(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-gray-900">Date format</span>
            <select
              value={dateFormat}
              onChange={(event) => setDateFormat(event.target.value as DateFormat)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {DATE_FORMAT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
            <span className="text-gray-400">Preview:</span>{' '}
            <span className="font-medium text-gray-800">
              {validDateValue ? formatDateValue(validDateValue, dateFormat) : '—'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDateValue(getTodayDateValue())}
            className="mt-3 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
          >
            Today
          </button>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={hideDateModal}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!validDateValue}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DateModal() {
  const { dateModal, stamps, lastDateValue, lastDateFormat } = useStore()
  const stamp = stamps.find((candidate) => candidate.id === dateModal.stampId)

  if (!dateModal.visible || !stamp || stamp.type !== 'date') return null

  return (
    <DateEditor
      stamp={stamp}
      fallbackDateValue={lastDateValue}
      fallbackDateFormat={lastDateFormat}
    />
  )
}
