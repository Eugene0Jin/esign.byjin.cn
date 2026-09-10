import { PDF_RENDER_SCALE } from '@/lib/pdfConstants'

export type SealTemplate = 'classic-round' | 'double-ring' | 'oval'
export type SealColor = 'red' | 'blue' | 'green' | 'black'
export type SealSize = '38x38' | '40x40' | '42x42' | '45x30' | '50x35'

export interface SealConfig {
  template: SealTemplate
  size: SealSize
  organizationName: string
  centerText: string
  serialText: string
  color: SealColor
}

interface SealSizeOption {
  id: SealSize
  label: string
  widthMm: number
  heightMm: number
  shape: 'round' | 'oval'
}

export const SEAL_TEMPLATE_OPTIONS: ReadonlyArray<{ id: SealTemplate; label: string }> = [
  { id: 'classic-round', label: 'Classic round' },
  { id: 'double-ring', label: 'Double ring' },
  { id: 'oval', label: 'Oval' },
]

export const SEAL_SIZE_OPTIONS: ReadonlyArray<SealSizeOption> = [
  { id: '38x38', label: '38 × 38 mm', widthMm: 38, heightMm: 38, shape: 'round' },
  { id: '40x40', label: '40 × 40 mm', widthMm: 40, heightMm: 40, shape: 'round' },
  { id: '42x42', label: '42 × 42 mm', widthMm: 42, heightMm: 42, shape: 'round' },
  { id: '45x30', label: '45 × 30 mm', widthMm: 45, heightMm: 30, shape: 'oval' },
  { id: '50x35', label: '50 × 35 mm', widthMm: 50, heightMm: 35, shape: 'oval' },
]

export const SEAL_COLOR_OPTIONS: ReadonlyArray<{ id: SealColor; label: string; value: string }> = [
  { id: 'red', label: 'Red', value: '#dc2626' },
  { id: 'blue', label: 'Blue', value: '#1d4ed8' },
  { id: 'green', label: 'Green', value: '#15803d' },
  { id: 'black', label: 'Black', value: '#111827' },
]

export const DEFAULT_SEAL_CONFIG: SealConfig = {
  template: 'double-ring',
  size: '42x42',
  organizationName: '',
  centerText: '',
  serialText: '',
  color: 'red',
}

const SEAL_STORAGE_KEY = 'free-esign.saved-seal.v1'
const SEAL_STORAGE_VERSION = 1
const SVG_FONT_STACK = "Arial, 'Microsoft YaHei', 'PingFang SC', sans-serif"

const sealTemplates = new Set<SealTemplate>(SEAL_TEMPLATE_OPTIONS.map((option) => option.id))
const sealSizes = new Set<SealSize>(SEAL_SIZE_OPTIONS.map((option) => option.id))
const sealColors = new Set<SealColor>(SEAL_COLOR_OPTIONS.map((option) => option.id))

const sliceCharacters = (value: string, maxLength: number) =>
  Array.from(value).slice(0, maxLength).join('')

const escapeXml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const isOvalTemplate = (template: SealTemplate) => template === 'oval'

const isCompatibleSize = (template: SealTemplate, size: SealSize) => {
  const sizeOption = SEAL_SIZE_OPTIONS.find((option) => option.id === size)
  return sizeOption?.shape === (isOvalTemplate(template) ? 'oval' : 'round')
}

export const getDefaultSealSize = (template: SealTemplate): SealSize =>
  isOvalTemplate(template) ? '45x30' : '42x42'

export const getSealSizeOptions = (template: SealTemplate) => {
  const shape = isOvalTemplate(template) ? 'oval' : 'round'
  return SEAL_SIZE_OPTIONS.filter((option) => option.shape === shape)
}

export const getSealSize = (size: SealSize) =>
  SEAL_SIZE_OPTIONS.find((option) => option.id === size) ?? SEAL_SIZE_OPTIONS[2]

export function normalizeSealConfig(config: SealConfig): SealConfig {
  const template = sealTemplates.has(config.template) ? config.template : DEFAULT_SEAL_CONFIG.template
  const size = sealSizes.has(config.size) && isCompatibleSize(template, config.size)
    ? config.size
    : getDefaultSealSize(template)

  return {
    template,
    size,
    organizationName: sliceCharacters(config.organizationName.trim(), 30),
    centerText: sliceCharacters(config.centerText.trim(), 10),
    serialText: sliceCharacters(config.serialText.trim(), 20),
    color: sealColors.has(config.color) ? config.color : DEFAULT_SEAL_CONFIG.color,
  }
}

const isSealConfig = (value: unknown): value is SealConfig => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SealConfig>
  return (
    typeof candidate.template === 'string' && sealTemplates.has(candidate.template as SealTemplate) &&
    typeof candidate.size === 'string' && sealSizes.has(candidate.size as SealSize) &&
    typeof candidate.organizationName === 'string' &&
    typeof candidate.centerText === 'string' &&
    typeof candidate.serialText === 'string' &&
    typeof candidate.color === 'string' && sealColors.has(candidate.color as SealColor)
  )
}

export function loadSavedSealConfig(): SealConfig | null {
  if (typeof window === 'undefined') return null

  try {
    const rawValue = window.localStorage.getItem(SEAL_STORAGE_KEY)
    if (!rawValue) return null
    const saved = JSON.parse(rawValue) as { version?: number; config?: unknown }
    if (saved.version !== SEAL_STORAGE_VERSION || !isSealConfig(saved.config)) return null
    return normalizeSealConfig(saved.config)
  } catch {
    return null
  }
}

export function persistSealConfig(config: SealConfig): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(SEAL_STORAGE_KEY, JSON.stringify({
      version: SEAL_STORAGE_VERSION,
      config: normalizeSealConfig(config),
    }))
  } catch {
    // Keep the in-memory value when browser storage is unavailable.
  }
}

export function clearPersistedSealConfig(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(SEAL_STORAGE_KEY)
  } catch {
    // The in-memory value is still cleared by the store action.
  }
}

const getSealColorValue = (color: SealColor) =>
  SEAL_COLOR_OPTIONS.find((option) => option.id === color)?.value ?? SEAL_COLOR_OPTIONS[0].value

const createStarPoints = (centerX: number, centerY: number, outerRadius: number) => {
  const innerRadius = outerRadius * 0.42
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    const angle = -Math.PI / 2 + index * Math.PI / 5
    return `${centerX + Math.cos(angle) * radius},${centerY + Math.sin(angle) * radius}`
  }).join(' ')
}

const getNameFontSize = (value: string, oval: boolean) => {
  const length = Math.max(Array.from(value).length, 1)
  const availableWidth = oval ? 590 : 570
  return Math.max(28, Math.min(52, availableWidth / (length + 1.5)))
}

export function createSealSvg(config: SealConfig): string {
  const normalized = normalizeSealConfig(config)
  const size = getSealSize(normalized.size)
  const width = 600
  const height = Math.round(width * size.heightMm / size.widthMm)
  const color = getSealColorValue(normalized.color)
  const organizationName = escapeXml(normalized.organizationName)
  const centerText = escapeXml(normalized.centerText)
  const serialText = escapeXml(normalized.serialText)
  const oval = isOvalTemplate(normalized.template)
  const nameFontSize = getNameFontSize(normalized.organizationName, oval)

  const commonText = `font-family="${SVG_FONT_STACK}" fill="${color}" text-anchor="middle"`

  if (oval) {
    const centerY = height / 2
    const radiusY = centerY - 20
    const namePathY = centerY + radiusY * 0.1
    const starY = centerY - 18
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <path id="seal-name-path" d="M 48 ${namePathY} A 252 ${radiusY * 0.82} 0 0 1 552 ${namePathY}"/>
        </defs>
        <ellipse cx="300" cy="${centerY}" rx="280" ry="${radiusY}" fill="none" stroke="${color}" stroke-width="13"/>
        <text ${commonText} font-size="${nameFontSize}" font-weight="600" letter-spacing="2">
          <textPath href="#seal-name-path" startOffset="50%" text-anchor="middle">${organizationName}</textPath>
        </text>
        <polygon points="${createStarPoints(300, starY, 48)}" fill="${color}"/>
        ${centerText ? `<text x="300" y="${centerY + 68}" ${commonText} font-size="42" font-weight="600">${centerText}</text>` : ''}
        ${serialText ? `<text x="300" y="${height - 36}" ${commonText} font-size="30" font-weight="500" letter-spacing="5">${serialText}</text>` : ''}
      </svg>
    `.trim()
  }

  const innerRing = normalized.template === 'double-ring'
    ? `<circle cx="300" cy="300" r="226" fill="none" stroke="${color}" stroke-width="5"/>`
    : ''
  const nameRadius = normalized.template === 'double-ring' ? 205 : 220
  const namePathStart = 300 - nameRadius
  const namePathEnd = 300 + nameRadius
  const starY = normalized.template === 'double-ring' ? 286 : 300

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <defs>
        <path id="seal-name-path" d="M ${namePathStart} 315 A ${nameRadius} ${nameRadius} 0 0 1 ${namePathEnd} 315"/>
      </defs>
      <circle cx="300" cy="300" r="270" fill="none" stroke="${color}" stroke-width="14"/>
      ${innerRing}
      <text ${commonText} font-size="${nameFontSize}" font-weight="600" letter-spacing="2">
        <textPath href="#seal-name-path" startOffset="50%" text-anchor="middle">${organizationName}</textPath>
      </text>
      <polygon points="${createStarPoints(300, starY, 64)}" fill="${color}"/>
      ${centerText ? `<text x="300" y="405" ${commonText} font-size="44" font-weight="600">${centerText}</text>` : ''}
      ${serialText ? `<text x="300" y="505" ${commonText} font-size="32" font-weight="500" letter-spacing="6">${serialText}</text>` : ''}
    </svg>
  `.trim()
}

export const createSealSvgDataUrl = (config: SealConfig) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(createSealSvg(config))}`

export async function createSealPng(config: SealConfig): Promise<string> {
  const size = getSealSize(config.size)
  const width = Math.round(size.widthMm / 25.4 * 300)
  const height = Math.round(size.heightMm / 25.4 * 300)
  const image = new Image()

  return new Promise((resolve, reject) => {
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Unable to create the seal canvas')
        context.clearRect(0, 0, width, height)
        context.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL('image/png'))
      } catch (error) {
        reject(error)
      }
    }
    image.onerror = () => reject(new Error('Unable to render the seal image'))
    image.src = createSealSvgDataUrl(config)
  })
}

export function getSealStampDimensions(config: SealConfig) {
  const size = getSealSize(config.size)
  const pointsPerMillimeter = 72 / 25.4
  return {
    width: size.widthMm * pointsPerMillimeter * PDF_RENDER_SCALE,
    height: size.heightMm * pointsPerMillimeter * PDF_RENDER_SCALE,
  }
}

