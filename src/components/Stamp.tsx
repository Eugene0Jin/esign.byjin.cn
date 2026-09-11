'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useStore, Stamp as StampType } from '@/store/useStore'

interface StampProps {
  stamp: StampType
  scale?: number
}

export default function Stamp({ stamp, scale = 1 }: StampProps) {
  const { selectedStampId, setSelectedStampId, updateStamp, removeStamp, setEditingStampId, editingStampId, showDateModal } = useStore()
  const displayScale = Number.isFinite(scale) && scale > 0 ? scale : 1
  const isSelected = selectedStampId === stamp.id
  const isEditing = editingStampId === stamp.id
  const activePointerId = useRef<number | null>(null)
  const interactionMode = useRef<'drag' | 'resize' | null>(null)
  const dragStart = useRef({ x: 0, y: 0, stampX: 0, stampY: 0 })
  const resizeStart = useRef({ width: 0, height: 0, pointerX: 0, pointerY: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return

    e.stopPropagation()
    if ((e.target as HTMLElement).closest('.resize-handle, button, input')) return

    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    activePointerId.current = e.pointerId
    interactionMode.current = 'drag'
    setSelectedStampId(stamp.id)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      stampX: stamp.x,
      stampY: stamp.y,
    }
  }, [stamp.id, stamp.x, stamp.y, setSelectedStampId])

  const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return

    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    activePointerId.current = e.pointerId
    interactionMode.current = 'resize'
    resizeStart.current = {
      width: stamp.width,
      height: stamp.height,
      pointerX: e.clientX,
      pointerY: e.clientY,
    }
  }, [stamp.width, stamp.height])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId || interactionMode.current === null) return

    e.preventDefault()

    if (interactionMode.current === 'drag') {
      const dx = (e.clientX - dragStart.current.x) / displayScale
      const dy = (e.clientY - dragStart.current.y) / displayScale
      updateStamp(stamp.id, {
        x: dragStart.current.stampX + dx,
        y: dragStart.current.stampY + dy,
      })
      return
    }

    const dx = (e.clientX - resizeStart.current.pointerX) / displayScale
    const dy = (e.clientY - resizeStart.current.pointerY) / displayScale

    if (stamp.type === 'seal') {
      const { width, height } = resizeStart.current
      const scaleDelta = (dx * width + dy * height) / (width * width + height * height)
      const minimumScale = Math.max(50 / width, 20 / height)
      const nextScale = Math.max(minimumScale, 1 + scaleDelta)
      updateStamp(stamp.id, {
        width: width * nextScale,
        height: height * nextScale,
      })
      return
    }

    const newWidth = Math.max(50, resizeStart.current.width + dx)
    const newHeight = Math.max(20, resizeStart.current.height + dy)
    // No max size limit - user can resize as large as needed
    updateStamp(stamp.id, { width: newWidth, height: newHeight })
  }, [displayScale, stamp.id, stamp.type, updateStamp])

  const handlePointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    activePointerId.current = null
    interactionMode.current = null
  }, [])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (stamp.type === 'text') {
      setEditingStampId(stamp.id)
    } else if (stamp.type === 'date') {
      showDateModal(stamp.id)
    }
  }, [stamp.id, stamp.type, setEditingStampId, showDateModal])

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateStamp(stamp.id, { content: e.target.value })
  }, [stamp.id, updateStamp])

  const handleTextBlur = useCallback(() => {
    setEditingStampId(null)
  }, [setEditingStampId])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setEditingStampId(null)
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!isEditing && isSelected) {
        removeStamp(stamp.id)
      }
    }
  }, [isEditing, isSelected, removeStamp, stamp.id, setEditingStampId])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const renderContent = () => {
    if (stamp.type === 'signature' || stamp.type === 'seal') {
      return (
        // Signature and seal images are generated in-browser as data URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={stamp.content}
          alt={stamp.type === 'seal' ? 'Seal' : 'Signature'}
          className="w-full h-full object-contain pointer-events-none"
          style={stamp.type === 'seal' ? {
            transform: `rotate(${stamp.rotation ?? 0}deg)`,
            transformOrigin: 'center',
          } : undefined}
          draggable={false}
        />
      )
    }

    if (stamp.type === 'text') {
      const fontSize = Math.max(12 * displayScale, Math.min(stamp.height * displayScale * 0.6, 64 * displayScale))
      if (isEditing) {
        return (
          <input
            ref={inputRef}
            value={stamp.content}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            onKeyDown={handleKeyDown}
            placeholder="Type here..."
            className="w-full h-full bg-transparent outline-none placeholder:text-gray-400 px-1"
            style={{ fontSize, fontFamily: stamp.fontFamily }}
          />
        )
      }
      return (
        <span
          className={`select-none truncate w-full h-full flex items-center px-1 ${!stamp.content ? 'text-gray-400' : ''}`}
          style={{ fontSize, fontFamily: stamp.fontFamily }}
        >
          {stamp.content || 'Text'}
        </span>
      )
    }

    if (stamp.type === 'date') {
      const fontSize = Math.max(12 * displayScale, Math.min(stamp.height * displayScale * 0.6, 48 * displayScale))
      return (
        <span
          className="select-none truncate w-full h-full flex items-center px-1"
          style={{ fontSize }}
        >
          {stamp.content}
        </span>
      )
    }

    if (stamp.type === 'checkmark') {
      const fontSize = Math.min(stamp.width, stamp.height) * displayScale * 0.9
      return (
        <span
          className="select-none w-full h-full flex items-center justify-center"
          style={{ fontSize, lineHeight: 1 }}
        >
          {stamp.content}
        </span>
      )
    }

    return null
  }

  return (
    <div
      ref={contentRef}
      className={`stamp-element absolute touch-none cursor-move ${
        isSelected ? 'outline outline-2 outline-blue-500' : ''
      }`}
      style={{
        left: stamp.x * displayScale,
        top: stamp.y * displayScale,
        width: stamp.width * displayScale,
        height: stamp.height * displayScale,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {renderContent()}
      {isSelected && (
        <>
          <div
            className="resize-handle absolute h-4 w-4 touch-none rounded-sm bg-blue-500 cursor-se-resize sm:h-3 sm:w-3"
            style={{ right: -6, bottom: -6 }}
            onPointerDown={handleResizePointerDown}
          />
          <button
            className="absolute w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
            style={{ top: -10, right: -10 }}
            onClick={(e) => {
              e.stopPropagation()
              removeStamp(stamp.id)
            }}
          >
            ×
          </button>
        </>
      )}
    </div>
  )
}
