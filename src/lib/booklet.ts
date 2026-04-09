import { type BookbinderConfig } from "./constants"

export interface SheetSide {
  /** 1-indexed page number, or 0 for blank */
  left: number
  /** 1-indexed page number, or 0 for blank */
  right: number
}

export interface Sheet {
  front: SheetSide
  back: SheetSide
}

/**
 * Compute the page ordering for saddle-stitch booklet binding.
 *
 * Given a total number of source pages, returns an array of Sheets.
 * Each sheet has a front and back, each holding two page slots.
 * Pages are 1-indexed; 0 means blank (padding).
 *
 * @param pageOffset - added to every page number (for multi-signature support)
 */
export function computeBookletSheets(
  totalPages: number,
  pageOffset = 0
): Sheet[] {
  const padded = Math.ceil(totalPages / 4) * 4
  const sheetCount = padded / 4
  const sheets: Sheet[] = []

  for (let i = 0; i < sheetCount; i++) {
    const frontLeft = padded - 2 * i
    const frontRight = 2 * i + 1
    const backLeft = 2 * i + 2
    const backRight = padded - 2 * i - 1

    sheets.push({
      front: {
        left: frontLeft <= totalPages ? frontLeft + pageOffset : 0,
        right: frontRight <= totalPages ? frontRight + pageOffset : 0,
      },
      back: {
        left: backLeft <= totalPages ? backLeft + pageOffset : 0,
        right: backRight <= totalPages ? backRight + pageOffset : 0,
      },
    })
  }

  return sheets
}

/**
 * Split pages into multiple signatures, each a self-contained saddle-stitch
 * booklet of up to `sheetsPerSignature` sheets (= sheetsPerSignature * 4 pages).
 */
export function computeMultiSignatureSheets(
  totalPages: number,
  sheetsPerSignature: number
): Sheet[] {
  const pagesPerSignature = sheetsPerSignature * 4
  const allSheets: Sheet[] = []
  let remaining = totalPages
  let offset = 0

  while (remaining > 0) {
    const sigPages = Math.min(remaining, pagesPerSignature)
    allSheets.push(...computeBookletSheets(sigPages, offset))
    offset += sigPages
    remaining -= sigPages
  }

  return allSheets
}

/**
 * Compute sheets respecting the current config (single or multi-signature).
 */
export function computeSheets(
  totalPages: number,
  config: BookbinderConfig
): Sheet[] {
  if (config.signatures.enabled && config.signatures.sheetsPerSignature > 0) {
    return computeMultiSignatureSheets(
      totalPages,
      config.signatures.sheetsPerSignature
    )
  }
  return computeBookletSheets(totalPages)
}

/** Flatten sheets into an ordered list of SheetSides (front, back, front, back, ...) */
export function flattenSheets(sheets: Sheet[]): SheetSide[] {
  const sides: SheetSide[] = []
  for (const sheet of sheets) {
    sides.push(sheet.front)
    sides.push(sheet.back)
  }
  return sides
}

export interface PreviewInfo {
  side: SheetSide
  sheetIndex: number
  isFront: boolean
}

/**
 * Pick a representative sheet side from near the middle of the book.
 * Prefers the front of the middle sheet so both page slots are filled.
 */
export function getPreviewSide(
  totalPages: number,
  config: BookbinderConfig
): PreviewInfo {
  const sheets = computeSheets(totalPages, config)
  if (sheets.length === 0) {
    return { side: { left: 0, right: 0 }, sheetIndex: 0, isFront: true }
  }
  const midIdx = Math.floor(sheets.length / 2)
  const sheet = sheets[midIdx]
  const useFront =
    sheet.front.left > 0 && sheet.front.right > 0
  return {
    side: useFront ? sheet.front : sheet.back,
    sheetIndex: midIdx,
    isFront: useFront,
  }
}
