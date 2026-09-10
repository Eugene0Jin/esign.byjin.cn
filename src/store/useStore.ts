import { create } from 'zustand'
import {
  clearPersistedSealConfig,
  loadSavedSealConfig,
  persistSealConfig,
  type SealConfig,
} from '@/lib/seal'
import {
  clearPersistedSignature,
  loadSavedSignature,
  persistSignature,
  type SavedSignature,
} from '@/lib/signature'
import {
  DEFAULT_DATE_FORMAT,
  getTodayDateValue,
  type DateFormat,
} from '@/lib/date'

export interface Stamp {
  id: string
  type: 'signature' | 'seal' | 'text' | 'date' | 'checkmark'
  x: number
  y: number
  width: number
  height: number
  content: string
  pageIndex: number
  fontFamily?: string
  rotation?: number
  dateValue?: string
  dateFormat?: DateFormat
}

interface ContextMenu {
  visible: boolean
  x: number
  y: number
  pageIndex: number
  viewportX: number
  viewportY: number
}

interface SignatureModal {
  visible: boolean
  x: number
  y: number
  pageIndex: number
}

interface SealModal {
  visible: boolean
  x: number
  y: number
  pageIndex: number
}

interface DateModal {
  visible: boolean
  stampId: string | null
}

export type Tool = 'select' | 'signature' | 'seal' | 'text' | 'date' | 'checkmark'
export type CheckmarkVariant = 'square' | 'check'

interface AppState {
  pdfFile: File | null
  pdfPages: string[]
  stamps: Stamp[]
  stampHistory: Stamp[][]
  historyIndex: number
  selectedStampId: string | null
  contextMenu: ContextMenu
  signatureModal: SignatureModal
  sealModal: SealModal
  dateModal: DateModal
  savedSealConfig: SealConfig | null
  savedSignature: SavedSignature | null
  lastDateValue: string
  lastDateFormat: DateFormat
  editingStampId: string | null
  selectedTool: Tool
  checkmarkVariant: CheckmarkVariant

  setPdfFile: (file: File | null) => void
  setPdfPages: (pages: string[]) => void
  addStamp: (stamp: Stamp) => void
  updateStamp: (id: string, updates: Partial<Stamp>) => void
  removeStamp: (id: string) => void
  setSelectedStampId: (id: string | null) => void
  showContextMenu: (x: number, y: number, pageIndex: number, viewportX: number, viewportY: number) => void
  hideContextMenu: () => void
  showSignatureModal: (x: number, y: number, pageIndex: number) => void
  hideSignatureModal: () => void
  showSealModal: (x: number, y: number, pageIndex: number) => void
  hideSealModal: () => void
  showDateModal: (stampId: string) => void
  hideDateModal: () => void
  setLastDateValue: (value: string) => void
  setLastDateFormat: (format: DateFormat) => void
  saveSealConfig: (config: SealConfig) => void
  clearSavedSealConfig: () => void
  saveSignature: (signature: SavedSignature) => void
  clearSavedSignature: () => void
  setEditingStampId: (id: string | null) => void
  setSelectedTool: (tool: Tool) => void
  setCheckmarkVariant: (variant: CheckmarkVariant) => void
  undo: () => void
  redo: () => void
  reset: () => void
}

const initialState = {
  pdfFile: null,
  pdfPages: [],
  stamps: [] as Stamp[],
  stampHistory: [[]] as Stamp[][],
  historyIndex: 0,
  selectedStampId: null,
  contextMenu: { visible: false, x: 0, y: 0, pageIndex: 0, viewportX: 0, viewportY: 0 },
  signatureModal: { visible: false, x: 0, y: 0, pageIndex: 0 },
  sealModal: { visible: false, x: 0, y: 0, pageIndex: 0 },
  dateModal: { visible: false, stampId: null },
  savedSealConfig: loadSavedSealConfig(),
  savedSignature: loadSavedSignature(),
  lastDateValue: getTodayDateValue(),
  lastDateFormat: DEFAULT_DATE_FORMAT,
  editingStampId: null,
  selectedTool: 'signature' as Tool,
  checkmarkVariant: 'square' as CheckmarkVariant,
}

export const useStore = create<AppState>((set) => ({
  ...initialState,

  setPdfFile: (file) => set({ pdfFile: file }),
  setPdfPages: (pages) => set({ pdfPages: pages }),

  addStamp: (stamp) => set((state) => {
    const newStamps = [...state.stamps, stamp]
    const newHistory = state.stampHistory.slice(0, state.historyIndex + 1)
    newHistory.push(newStamps)
    return {
      stamps: newStamps,
      stampHistory: newHistory,
      historyIndex: newHistory.length - 1,
    }
  }),

  updateStamp: (id, updates) => set((state) => {
    const newStamps = state.stamps.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    )
    const newHistory = state.stampHistory.slice(0, state.historyIndex + 1)
    newHistory.push(newStamps)
    return {
      stamps: newStamps,
      stampHistory: newHistory,
      historyIndex: newHistory.length - 1,
    }
  }),

  removeStamp: (id) => set((state) => {
    const newStamps = state.stamps.filter((s) => s.id !== id)
    const newHistory = state.stampHistory.slice(0, state.historyIndex + 1)
    newHistory.push(newStamps)
    return {
      stamps: newStamps,
      stampHistory: newHistory,
      historyIndex: newHistory.length - 1,
      selectedStampId: state.selectedStampId === id ? null : state.selectedStampId,
    }
  }),

  setSelectedStampId: (id) => set({ selectedStampId: id }),

  showContextMenu: (x, y, pageIndex, viewportX, viewportY) => set({
    contextMenu: { visible: true, x, y, pageIndex, viewportX, viewportY }
  }),

  hideContextMenu: () => set({
    contextMenu: { visible: false, x: 0, y: 0, pageIndex: 0, viewportX: 0, viewportY: 0 }
  }),

  showSignatureModal: (x, y, pageIndex) => set({ signatureModal: { visible: true, x, y, pageIndex } }),
  hideSignatureModal: () => set({ signatureModal: { visible: false, x: 0, y: 0, pageIndex: 0 } }),

  showSealModal: (x, y, pageIndex) => set({ sealModal: { visible: true, x, y, pageIndex } }),
  hideSealModal: () => set({ sealModal: { visible: false, x: 0, y: 0, pageIndex: 0 } }),
  showDateModal: (stampId) => set({ dateModal: { visible: true, stampId } }),
  hideDateModal: () => set({ dateModal: { visible: false, stampId: null } }),
  setLastDateValue: (value) => set({ lastDateValue: value }),
  setLastDateFormat: (format) => set({ lastDateFormat: format }),
  saveSealConfig: (config) => {
    persistSealConfig(config)
    set({ savedSealConfig: config })
  },
  clearSavedSealConfig: () => {
    clearPersistedSealConfig()
    set({ savedSealConfig: null })
  },
  saveSignature: (signature) => {
    persistSignature(signature)
    set({ savedSignature: signature })
  },
  clearSavedSignature: () => {
    clearPersistedSignature()
    set({ savedSignature: null })
  },

  setEditingStampId: (id) => set({ editingStampId: id }),

  setSelectedTool: (tool) => set({ selectedTool: tool }),

  setCheckmarkVariant: (variant) => set({ checkmarkVariant: variant }),

  undo: () => set((state) => {
    if (state.historyIndex <= 0) return state
    const newIndex = state.historyIndex - 1
    return {
      stamps: state.stampHistory[newIndex],
      historyIndex: newIndex,
      selectedStampId: null,
    }
  }),

  redo: () => set((state) => {
    if (state.historyIndex >= state.stampHistory.length - 1) return state
    const newIndex = state.historyIndex + 1
    return {
      stamps: state.stampHistory[newIndex],
      historyIndex: newIndex,
      selectedStampId: null,
    }
  }),

  reset: () => set((state) => ({
    ...initialState,
    savedSealConfig: state.savedSealConfig,
    savedSignature: state.savedSignature,
    lastDateValue: getTodayDateValue(),
    lastDateFormat: DEFAULT_DATE_FORMAT,
  })),
}))
