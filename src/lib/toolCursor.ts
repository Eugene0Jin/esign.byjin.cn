import type { CheckmarkVariant, Tool } from '@/store/useStore'

const CURSOR_SIZE = 28
const CURSOR_HOTSPOT = CURSOR_SIZE / 2

const cursorFrame = (content: string) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${CURSOR_SIZE}" height="${CURSOR_SIZE}" viewBox="0 0 28 28">
    <rect x="1" y="1" width="26" height="26" rx="7" fill="white" stroke="#93c5fd" stroke-width="2"/>
    <g fill="none" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${content}
    </g>
  </svg>
`

const toolCursorSvgs: Record<Exclude<Tool, 'select' | 'checkmark'>, string> = {
  signature: cursorFrame(`
    <path d="M17.23 7.23l3.54 3.54M18.73 5.73a2.5 2.5 0 013.54 3.54L8.5 23.04H5v-3.57L18.73 5.73z"/>
  `),
  seal: cursorFrame(`
    <circle cx="14" cy="14" r="8"/>
    <circle cx="14" cy="14" r="5.5" stroke-width="1.5"/>
    <path d="M14 10.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3 1-2z" stroke-width="1.5"/>
  `),
  text: cursorFrame(`
    <path d="M7 8h14M14 8v13M10.5 21h7"/>
  `),
  date: cursorFrame(`
    <path d="M10 7V4m8 3V4M8 12h12M7 23h14a2 2 0 002-2V8a2 2 0 00-2-2H7a2 2 0 00-2 2v13a2 2 0 002 2z"/>
  `),
}

const checkmarkCursorSvgs: Record<CheckmarkVariant, string> = {
  square: cursorFrame('<rect x="9" y="9" width="10" height="10" rx="1" fill="#1d4ed8" stroke="none"/>'),
  check: cursorFrame('<path d="M8 14.5l4 4L20 10"/>'),
}

const toCssCursor = (svg: string) => {
  const dataUri = `data:image/svg+xml,${encodeURIComponent(svg.trim())}`
  return `url("${dataUri}") ${CURSOR_HOTSPOT} ${CURSOR_HOTSPOT}, crosshair`
}

const toolCursors = {
  signature: toCssCursor(toolCursorSvgs.signature),
  seal: toCssCursor(toolCursorSvgs.seal),
  text: toCssCursor(toolCursorSvgs.text),
  date: toCssCursor(toolCursorSvgs.date),
  checkmark: {
    square: toCssCursor(checkmarkCursorSvgs.square),
    check: toCssCursor(checkmarkCursorSvgs.check),
  },
}

export function getToolCursor(tool: Tool, checkmarkVariant: CheckmarkVariant): string {
  if (tool === 'select') return 'default'
  if (tool === 'checkmark') return toolCursors.checkmark[checkmarkVariant]
  return toolCursors[tool]
}
