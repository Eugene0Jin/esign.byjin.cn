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
    <path transform="translate(4 4) scale(0.01953125)" d="M689.9712 372.40832l74.71104-74.17856-75.85792-75.32544-74.71104 74.1376 75.85792 75.3664z m-47.06304 46.6944l-75.85792-75.32544-334.0288 331.5712c-13.9264 13.80352-31.29344 45.91616-35.26656 65.20832l-11.75552 56.81152 57.26208-11.6736c19.61984-4.01408 51.56864-21.0944 65.65888-35.06176l333.98784-331.53024z m6.22592-237.64992c10.48576-10.52672 24.7808-16.42496 39.69024-16.42496 14.90944 0 29.20448 5.89824 39.69024 16.42496l77.98784 77.37344a55.5008 55.5008 0 0 1 0 78.848L349.67552 791.1424c-21.9136 21.74976-63.97952 44.35968-94.8224 50.62656l-85.72928 17.44896c-12.65664 2.58048-25.76384-1.31072-34.89792-10.40384a38.01088 38.01088 0 0 1-10.48576-34.65216L141.312 729.088c6.22592-30.22848 29.04064-72.41728 50.9952-94.16704L649.13408 181.4528z m124.1088 543.41632c-4.38272 26.54208-20.76672 50.50368-46.61248 69.34528 53.0432 3.39968 93.26592-14.09024 123.41248-52.34688 9.6256-12.16512 27.32032-14.336 39.69024-4.9152 12.32896 9.46176 14.58176 26.95168 4.99712 39.1168-51.77344 65.65888-127.34464 87.73632-221.47072 66.39616a159.70304 159.70304 0 0 1-34.24256-11.79648c-78.56128 19.53792-150.44608 29.2864-215.57248 29.2864-7.49568 0.04096-14.66368-2.90816-19.94752-8.11008a27.705344 27.705344 0 0 1-8.31488-19.78368c0.08192-15.44192 12.73856-27.93472 28.30336-27.89376 50.25792 0 105.472-6.38976 165.60128-19.21024-11.14112-20.64384-14.17216-44.81024-8.3968-70.0416 12.20608-53.16608 60.6208-93.34784 113.95072-85.72928 53.12512 7.70048 86.54848 48.16896 78.60224 95.68256z m-137.46176 2.4576c-3.85024 16.91648-0.12288 31.9488 12.36992 43.29472 81.42848-24.33024 88.96512-78.88896 38.25664-86.17984-21.42208-3.03104-44.4416 16.09728-50.62656 42.88512z m0 0" fill="#1d4ed8" stroke="none"/>
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
