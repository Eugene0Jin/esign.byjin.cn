import { PDF_RENDER_SCALE } from '@/lib/pdfConstants'

export type SealTemplate = 'classic-round' | 'plain-round' | 'oval'
export type SealColor = 'red' | 'blue' | 'green' | 'black'
export type SealSize = '38x38' | '40x40' | '42x42' | '45x30' | '50x35'

export interface SealConfig {
  template: SealTemplate
  size: SealSize
  organizationName: string
  centerText: string
  serialText: string
  color: SealColor
  rotation: number
  realism: number
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
  { id: 'plain-round', label: 'Plain round' },
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
  template: 'classic-round',
  size: '42x42',
  organizationName: '湖南省xx信息技术有限公司',
  centerText: '',
  serialText: '',
  color: 'red',
  rotation: 0,
  realism: 0,
}

const SEAL_STORAGE_KEY = 'free-esign.saved-seal.v1'
const SEAL_STORAGE_VERSION = 1
const SVG_FONT_STACK = "Arial, 'Microsoft YaHei', 'PingFang SC', sans-serif"
const ROUND_SEAL_FONT_STACK = "'SimSun', 'Songti SC', 'STSong', serif"
const ROUND_SERIAL_FONT_STACK = "Arial, 'SimSun', 'Songti SC', serif"

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
    rotation: Number.isFinite(config.rotation)
      ? Math.min(360, Math.max(0, Math.round(config.rotation)))
      : DEFAULT_SEAL_CONFIG.rotation,
    realism: Number.isFinite(config.realism)
      ? Math.min(100, Math.max(0, Math.round(config.realism)))
      : DEFAULT_SEAL_CONFIG.realism,
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
    typeof candidate.color === 'string' && sealColors.has(candidate.color as SealColor) &&
    typeof candidate.rotation === 'number' && Number.isFinite(candidate.rotation) &&
    typeof candidate.realism === 'number' && Number.isFinite(candidate.realism)
  )
}

export function loadSavedSealConfig(): SealConfig | null {
  if (typeof window === 'undefined') return null

  try {
    const rawValue = window.localStorage.getItem(SEAL_STORAGE_KEY)
    if (!rawValue) return null
    const saved = JSON.parse(rawValue) as { version?: number; config?: unknown }
    if (saved.version !== SEAL_STORAGE_VERSION) return null

    // Earlier builds used "double-ring" for the second option. Preserve the
    // user's saved text, size, and color while mapping it to the corrected
    // single-ring, no-star template.
    const storedConfig = saved.config && typeof saved.config === 'object'
      ? saved.config as Record<string, unknown>
      : null
    const migratedConfig = storedConfig
      ? {
          ...storedConfig,
          template: storedConfig.template === 'double-ring' ? 'plain-round' : storedConfig.template,
          rotation: typeof storedConfig.rotation === 'number' ? storedConfig.rotation : 0,
          realism: typeof storedConfig.realism === 'number' ? storedConfig.realism : 0,
        }
      : saved.config

    if (!isSealConfig(migratedConfig)) return null
    return normalizeSealConfig(migratedConfig)
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
  const characters = Array.from(value)
  const length = Math.max(characters.length, 1)
  if (oval) return Math.max(28, Math.min(52, 590 / (length + 1.5)))

  const weightedLength = Math.max(characters.reduce(
    (total, character) => total + (/^[\x00-\x7F]$/.test(character) ? 0.6 : 1),
    0,
  ), 1)
  const availableArcWidth = 790 - Math.max(length - 1, 0) * 3
  return Math.max(24, Math.min(60, availableArcWidth / weightedLength))
}

const hashString = (value: string) => Array.from(value).reduce(
  (hash, character) => Math.imul(hash ^ character.codePointAt(0)!, 16777619) >>> 0,
  2166136261,
)

const createSeededRandom = (seed: number) => {
  let state = seed || 1
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

const formatSvgNumber = (value: number) => value.toFixed(2)

const createSealDistress = (config: SealConfig, width: number, height: number) => {
  const strength = config.realism / 100
  if (strength <= 0) return { definitions: '', attributes: '' }

  const seed = hashString([
    config.template,
    config.size,
    config.organizationName,
    config.centerText,
    config.serialText,
    config.color,
  ].join('|'))
  const random = createSeededRandom(seed)
  const scale = Math.min(width, height) / 600
  const speckleCount = Math.round(20 + strength * 900)
  const streakCount = Math.round(strength * 64)
  const patchCount = Math.round(strength * 24)

  const speckles = Array.from({ length: speckleCount }, () => {
    const centerX = random() * width
    const centerY = random() * height
    const radiusX = (0.5 + random() * (1.5 + strength * 5)) * scale
    const radiusY = (0.35 + random() * (1 + strength * 3)) * scale
    const opacity = 0.38 + strength * 0.42 + random() * 0.2
    return `<ellipse cx="${formatSvgNumber(centerX)}" cy="${formatSvgNumber(centerY)}" rx="${formatSvgNumber(radiusX)}" ry="${formatSvgNumber(radiusY)}" transform="rotate(${formatSvgNumber(random() * 180)} ${formatSvgNumber(centerX)} ${formatSvgNumber(centerY)})" fill="black" fill-opacity="${formatSvgNumber(Math.min(opacity, 1))}"/>`
  }).join('')

  const streaks = Array.from({ length: streakCount }, () => {
    const streakWidth = (8 + random() * (34 + strength * 50)) * scale
    const streakHeight = (0.5 + random() * (1.5 + strength * 3)) * scale
    const x = random() * Math.max(width - streakWidth, 1)
    const y = random() * height
    return `<rect x="${formatSvgNumber(x)}" y="${formatSvgNumber(y)}" width="${formatSvgNumber(streakWidth)}" height="${formatSvgNumber(streakHeight)}" rx="${formatSvgNumber(streakHeight / 2)}" fill="black" fill-opacity="${formatSvgNumber(0.35 + random() * 0.5)}"/>`
  }).join('')

  const patches = Array.from({ length: patchCount }, () => {
    const centerX = random() * width
    const centerY = random() * height
    const patchWidth = (6 + random() * (14 + strength * 28)) * scale
    const patchHeight = (2 + random() * (5 + strength * 9)) * scale
    return `<ellipse cx="${formatSvgNumber(centerX)}" cy="${formatSvgNumber(centerY)}" rx="${formatSvgNumber(patchWidth / 2)}" ry="${formatSvgNumber(patchHeight / 2)}" transform="rotate(${formatSvgNumber(-18 + random() * 36)} ${formatSvgNumber(centerX)} ${formatSvgNumber(centerY)})" fill="black" fill-opacity="${formatSvgNumber(0.28 + strength * 0.48)}"/>`
  }).join('')

  const opacity = formatSvgNumber(1 - strength * 0.12)
  const displacement = formatSvgNumber(strength * 1.6)

  return {
    definitions: `
      <mask id="seal-distress-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">
        <rect width="${width}" height="${height}" fill="white"/>
        ${speckles}${streaks}${patches}
      </mask>
      <filter id="seal-distress-wobble" x="-3%" y="-3%" width="106%" height="106%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${seed % 997}" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="${displacement}" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    `,
    attributes: `mask="url(#seal-distress-mask)" filter="url(#seal-distress-wobble)" opacity="${opacity}"`,
  }
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
  const distress = createSealDistress(normalized, width, height)

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
          ${distress.definitions}
        </defs>
        <g ${distress.attributes}>
          <ellipse cx="300" cy="${centerY}" rx="280" ry="${radiusY}" fill="none" stroke="${color}" stroke-width="13"/>
          <text ${commonText} font-size="${nameFontSize}" font-weight="600" letter-spacing="2">
            <textPath href="#seal-name-path" startOffset="50%" text-anchor="middle">${organizationName}</textPath>
          </text>
          <polygon points="${createStarPoints(300, starY, 48)}" fill="${color}"/>
          ${centerText ? `<text x="300" y="${centerY + 68}" ${commonText} font-size="42" font-weight="600">${centerText}</text>` : ''}
          ${serialText ? `<text x="300" y="${height - 36}" ${commonText} font-size="30" font-weight="500" letter-spacing="5">${serialText}</text>` : ''}
        </g>
      </svg>
    `.trim()
  }

  // Real-world Chinese company seals use a thin outer rim, Song-style type,
  // a broad upper arc, and a separate curved serial along the lower rim.
  const nameRadius = 205
  const namePathY = 300 + Math.sin(35 * Math.PI / 180) * nameRadius
  const namePathOffset = Math.cos(35 * Math.PI / 180) * nameRadius
  const namePathStart = 300 - namePathOffset
  const namePathEnd = 300 + namePathOffset
  const serialRadius = 248
  const serialPathY = 300 + Math.sin(40 * Math.PI / 180) * serialRadius
  const serialPathOffset = Math.cos(40 * Math.PI / 180) * serialRadius
  const serialPathStart = 300 - serialPathOffset
  const serialPathEnd = 300 + serialPathOffset
  const star = normalized.template === 'classic-round'
    ? `<polygon points="${createStarPoints(300, 315, 95)}" fill="${color}"/>`
    : ''

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <defs>
        <path id="seal-name-path" d="M ${namePathStart} ${namePathY} A ${nameRadius} ${nameRadius} 0 1 1 ${namePathEnd} ${namePathY}"/>
        <path id="seal-serial-path" d="M ${serialPathStart} ${serialPathY} A ${serialRadius} ${serialRadius} 0 0 0 ${serialPathEnd} ${serialPathY}"/>
        ${distress.definitions}
      </defs>
      <g ${distress.attributes}>
        <circle cx="300" cy="300" r="280" fill="none" stroke="${color}" stroke-width="10"/>
        <text font-family="${ROUND_SEAL_FONT_STACK}" fill="${color}" text-anchor="middle" font-size="${nameFontSize}" font-weight="400" letter-spacing="3">
          <textPath href="#seal-name-path" startOffset="50%" text-anchor="middle">${organizationName}</textPath>
        </text>
        ${star}
        ${centerText ? `<text x="300" y="${normalized.template === 'plain-round' ? 320 : 430}" font-family="${ROUND_SEAL_FONT_STACK}" fill="${color}" text-anchor="middle" font-size="44" font-weight="400" letter-spacing="2">${centerText}</text>` : ''}
        ${serialText ? `<text font-family="${ROUND_SERIAL_FONT_STACK}" fill="${color}" text-anchor="middle" font-size="28" font-weight="400" letter-spacing="5"><textPath href="#seal-serial-path" startOffset="50%" text-anchor="middle">${serialText}</textPath></text>` : ''}
      </g>
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
