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
 */
export function computeBookletSheets(totalPages: number): Sheet[] {
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
        left: frontLeft <= totalPages ? frontLeft : 0,
        right: frontRight <= totalPages ? frontRight : 0,
      },
      back: {
        left: backLeft <= totalPages ? backLeft : 0,
        right: backRight <= totalPages ? backRight : 0,
      },
    })
  }

  return sheets
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
