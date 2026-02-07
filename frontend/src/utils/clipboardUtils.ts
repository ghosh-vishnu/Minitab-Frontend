/**
 * Clipboard Utilities for Excel-like Paste Operations
 * Handles parsing and normalization of tabular clipboard data
 */

export interface ParsedClipboardData {
  rows: string[][]
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

/**
 * Parse clipboard text into a 2D array
 * Handles tab-separated columns and newline-separated rows
 * Example input: "101.18\t99.06\n101.55\t100.23"
 */
export function parseClipboardData(text: string): string[][] {
  if (!text || text.trim().length === 0) {
    return []
  }

  return text
    .split('\n')
    .map((row) =>
      row
        .split('\t')
        .map((cell) => cell.trim())
        .filter((cell) => cell !== '')
    )
    .filter((row) => row.length > 0)
}

/**
 * Convert clipboard value to appropriate type (number or string)
 * Preserves numeric values as numbers for proper spreadsheet behavior
 */
export function normalizeValue(value: string, parseNumber = false): string | number {
  // If parseNumber is false (default) we preserve the incoming value as a string
  // to avoid implicit numeric coercion and formatting. Callers that explicitly
  // want numeric parsing should pass `parseNumber = true`.
  if (value === '' || value === null) return ''

  const trimmed = value.trim()

  if (!parseNumber) {
    return trimmed
  }

  // Try to parse as number only when explicitly requested
  const num = Number(trimmed)
  if (!isNaN(num) && trimmed !== '' && trimmed !== 'NaN' && trimmed !== 'Infinity') {
    return num
  }

  return trimmed
}

/**
 * Read text from system clipboard using Clipboard API with fallback
 */
export async function readClipboard(): Promise<string> {
  try {
    // Primary method: Modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.readText) {
      return await navigator.clipboard.readText()
    }
  } catch (error) {
    console.warn('Clipboard API unavailable or denied:', error)
  }

  // Fallback: Return empty string if clipboard is inaccessible
  throw new Error('Unable to access clipboard. Ensure the page has clipboard permissions.')
}

/**
 * Calculate the bounding box of pasted data
 */
export function calculatePasteBounds(
  startRow: number,
  startCol: number,
  rows: string[][]
): {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
  rowCount: number
  colCount: number
} {
  const rowCount = rows.length
  const colCount = rows.length > 0 ? Math.max(...rows.map((r) => r.length)) : 0

  return {
    startRow,
    startCol,
    endRow: startRow + rowCount - 1,
    endCol: startCol + colCount - 1,
    rowCount,
    colCount,
  }
}

/**
 * Check if data requires grid expansion
 */
export function needsGridExpansion(
  bounds: ReturnType<typeof calculatePasteBounds>,
  currentRowCount: number,
  currentColCount: number
): {
  needsRowExpansion: boolean
  needsColExpansion: boolean
  newRowCount: number
  newColCount: number
} {
  const needsRowExpansion = bounds.endRow >= currentRowCount
  const needsColExpansion = bounds.endCol >= currentColCount

  return {
    needsRowExpansion,
    needsColExpansion,
    newRowCount: Math.max(currentRowCount, bounds.endRow + 1),
    newColCount: Math.max(currentColCount, bounds.endCol + 1),
  }
}
