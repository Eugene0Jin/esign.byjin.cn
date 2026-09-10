export type SignatureMode = 'draw' | 'type' | 'fonts'

export interface SavedSignature {
  mode: SignatureMode
  content: string
  typedName: string
  fontName: string
}

const SIGNATURE_STORAGE_KEY = 'free-esign.saved-signature.v1'
const SIGNATURE_STORAGE_VERSION = 1
const signatureModes = new Set<SignatureMode>(['draw', 'type', 'fonts'])

function isSavedSignature(value: unknown): value is SavedSignature {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<SavedSignature>
  return (
    typeof candidate.mode === 'string' && signatureModes.has(candidate.mode as SignatureMode) &&
    typeof candidate.content === 'string' && candidate.content.startsWith('data:image/png;base64,') &&
    typeof candidate.typedName === 'string' &&
    typeof candidate.fontName === 'string'
  )
}

export function loadSavedSignature(): SavedSignature | null {
  if (typeof window === 'undefined') return null

  try {
    const rawValue = window.localStorage.getItem(SIGNATURE_STORAGE_KEY)
    if (!rawValue) return null

    const saved = JSON.parse(rawValue) as { version?: number; signature?: unknown }
    if (saved.version !== SIGNATURE_STORAGE_VERSION || !isSavedSignature(saved.signature)) {
      return null
    }

    return saved.signature
  } catch {
    return null
  }
}

export function persistSignature(signature: SavedSignature): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(SIGNATURE_STORAGE_KEY, JSON.stringify({
      version: SIGNATURE_STORAGE_VERSION,
      signature,
    }))
  } catch {
    // Keep the in-memory value when browser storage is unavailable.
  }
}

export function clearPersistedSignature(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(SIGNATURE_STORAGE_KEY)
  } catch {
    // Clearing browser storage is best effort only.
  }
}
