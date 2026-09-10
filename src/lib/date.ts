const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export type DateFormat =
  | 'MM/DD/YYYY'
  | 'DD/MM/YYYY'
  | 'YYYY-MM-DD'
  | 'YYYY/MM/DD'
  | 'YYYY.MM.DD'
  | 'YYYY年MM月DD日'

export const DEFAULT_DATE_FORMAT: DateFormat = 'MM/DD/YYYY'

export const DATE_FORMAT_OPTIONS: ReadonlyArray<{ id: DateFormat; label: string }> = [
  { id: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { id: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { id: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { id: 'YYYY/MM/DD', label: 'YYYY/MM/DD' },
  { id: 'YYYY.MM.DD', label: 'YYYY.MM.DD' },
  { id: 'YYYY年MM月DD日', label: 'YYYY年MM月DD日' },
]

export interface ParsedDisplayDate {
  value: string
  format: DateFormat
}

export function getTodayDateValue(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function normalizeDateValue(value: string | undefined): string | null {
  if (!value) return null

  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1) return null

  const daysInMonth = new Date(year, month, 0).getDate()
  return day <= daysInMonth ? value : null
}

export function formatDateValue(
  value: string,
  format: DateFormat = DEFAULT_DATE_FORMAT
): string {
  const normalized = normalizeDateValue(value)
  if (!normalized) return ''

  const [year, month, day] = normalized.split('-')
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`
    case 'YYYY/MM/DD':
      return `${year}/${month}/${day}`
    case 'YYYY.MM.DD':
      return `${year}.${month}.${day}`
    case 'YYYY年MM月DD日':
      return `${year}年${month}月${day}日`
    default:
      return `${month}/${day}/${year}`
  }
}

export function parseDisplayDate(value: string): ParsedDisplayDate | null {
  const trimmedValue = value.trim()

  const chineseMatch = /^(\d{4})年(\d{2})月(\d{2})日$/.exec(trimmedValue)
  if (chineseMatch) {
    const [, year, month, day] = chineseMatch
    const normalized = normalizeDateValue(`${year}-${month}-${day}`)
    return normalized ? { value: normalized, format: 'YYYY年MM月DD日' } : null
  }

  const yearFirstMatch = /^(\d{4})([-/.])(\d{2})\2(\d{2})$/.exec(trimmedValue)
  if (yearFirstMatch) {
    const [, year, separator, month, day] = yearFirstMatch
    const normalized = normalizeDateValue(`${year}-${month}-${day}`)
    if (!normalized) return null

    const format: DateFormat = separator === '-'
      ? 'YYYY-MM-DD'
      : separator === '.'
        ? 'YYYY.MM.DD'
        : 'YYYY/MM/DD'
    return { value: normalized, format }
  }

  const slashMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmedValue)
  if (!slashMatch) return null

  const [, first, second, year] = slashMatch
  const monthFirst = normalizeDateValue(`${year}-${first}-${second}`)
  if (monthFirst) return { value: monthFirst, format: 'MM/DD/YYYY' }

  const dayFirst = normalizeDateValue(`${year}-${second}-${first}`)
  return dayFirst ? { value: dayFirst, format: 'DD/MM/YYYY' } : null
}
