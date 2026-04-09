import { PDFDocument, PDFEmbeddedPage, rgb, LineCapStyle } from "pdf-lib"
import { type BookbinderConfig } from "./constants"
import { calculateLayout, type LayoutResult } from "./layout"
import {
  computeBookletSheets,
  flattenSheets,
  type SheetSide,
} from "./booklet"

async function renderSide(
  outputDoc: PDFDocument,
  embeddedPages: PDFEmbeddedPage[],
  side: SheetSide,
  layout: LayoutResult
) {
  const page = outputDoc.addPage([layout.page.width, layout.page.height])

  if (layout.cutLines) {
    const cl = layout.cutLines
    page.drawRectangle({
      x: cl.x,
      y: cl.y,
      width: cl.width,
      height: cl.height,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 0.5,
      borderDashArray: [4, 4],
      borderLineCap: LineCapStyle.Round,
    })
  }

  const pages: [number, typeof layout.leftPage][] = [
    [side.left, layout.leftPage],
    [side.right, layout.rightPage],
  ]

  for (const [pageNum, placement] of pages) {
    if (pageNum === 0 || !placement.rect.width) continue

    const embedded = embeddedPages[pageNum - 1]
    if (!embedded) continue

    page.drawPage(embedded, {
      x: placement.rect.x,
      y: placement.rect.y,
      width: placement.rect.width,
      height: placement.rect.height,
    })
  }

  return page
}

function copyBytes(src: Uint8Array): Uint8Array {
  const copy = new Uint8Array(src.length)
  copy.set(src)
  return copy
}

export async function buildPreviewPage(
  sourcePdfBytes: Uint8Array,
  config: BookbinderConfig,
  sourcePageSize: { width: number; height: number }
): Promise<Uint8Array> {
  const sourceDoc = await PDFDocument.load(copyBytes(sourcePdfBytes))
  const outputDoc = await PDFDocument.create()

  const totalPages = sourceDoc.getPageCount()
  const sheets = computeBookletSheets(totalPages)
  const sides = flattenSheets(sheets)

  const embeddedPages = await outputDoc.embedPages(sourceDoc.getPages())
  const layout = calculateLayout(config, sourcePageSize)

  if (sides.length > 0) {
    await renderSide(outputDoc, embeddedPages, sides[0], layout)
  }

  return outputDoc.save({ useObjectStreams: false })
}

export async function buildFullBooklet(
  sourcePdfBytes: Uint8Array,
  config: BookbinderConfig,
  sourcePageSize: { width: number; height: number }
): Promise<Uint8Array> {
  const sourceDoc = await PDFDocument.load(copyBytes(sourcePdfBytes))
  const outputDoc = await PDFDocument.create()

  const totalPages = sourceDoc.getPageCount()
  const sheets = computeBookletSheets(totalPages)
  const sides = flattenSheets(sheets)

  const embeddedPages = await outputDoc.embedPages(sourceDoc.getPages())
  const layout = calculateLayout(config, sourcePageSize)

  for (const side of sides) {
    await renderSide(outputDoc, embeddedPages, side, layout)
  }

  return outputDoc.save({ useObjectStreams: false })
}
