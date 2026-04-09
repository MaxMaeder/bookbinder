import {
  PDFDocument,
  type PDFEmbeddedPage,
  type PDFImage,
  rgb,
  LineCapStyle,
} from "pdf-lib"
import * as pdfjsLib from "pdfjs-dist"
import { type BookbinderConfig } from "./constants"
import { calculateLayout, type LayoutResult } from "./layout"
import {
  computeBookletSheets,
  flattenSheets,
  type SheetSide,
} from "./booklet"

type PageAsset =
  | { kind: "vector"; page: PDFEmbeddedPage }
  | { kind: "raster"; image: PDFImage }

const RASTER_DPI = 200
const RASTER_SCALE = RASTER_DPI / 72

function copyBytes(src: Uint8Array): Uint8Array {
  const copy = new Uint8Array(src.length)
  copy.set(src)
  return copy
}

async function tryEmbedVector(
  sourcePdfBytes: Uint8Array,
  outputDoc: PDFDocument
): Promise<PageAsset[] | null> {
  try {
    const sourceDoc = await PDFDocument.load(copyBytes(sourcePdfBytes))
    const embedded = await outputDoc.embedPages(sourceDoc.getPages())
    return embedded.map((page) => ({ kind: "vector", page }))
  } catch {
    return null
  }
}

async function embedRaster(
  sourcePdfBytes: Uint8Array,
  totalPages: number,
  outputDoc: PDFDocument
): Promise<PageAsset[]> {
  const loadingTask = pdfjsLib.getDocument({
    data: copyBytes(sourcePdfBytes),
  })
  const pdf = await loadingTask.promise
  const assets: PageAsset[] = []

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: RASTER_SCALE })

    const canvas = document.createElement("canvas")
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)

    await page.render({ canvas, viewport }).promise

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png")
    )
    const arrayBuf = await blob.arrayBuffer()
    const image = await outputDoc.embedPng(new Uint8Array(arrayBuf))
    assets.push({ kind: "raster", image })
  }

  pdf.destroy()
  return assets
}

function drawPageAsset(
  outputPage: ReturnType<PDFDocument["addPage"]>,
  asset: PageAsset,
  x: number,
  y: number,
  width: number,
  height: number
) {
  if (asset.kind === "vector") {
    outputPage.drawPage(asset.page, { x, y, width, height })
  } else {
    outputPage.drawImage(asset.image, { x, y, width, height })
  }
}

function renderSide(
  outputDoc: PDFDocument,
  assets: PageAsset[],
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

  const placements: [number, typeof layout.leftPage][] = [
    [side.left, layout.leftPage],
    [side.right, layout.rightPage],
  ]

  for (const [pageNum, placement] of placements) {
    if (pageNum === 0 || !placement.rect.width) continue

    const asset = assets[pageNum - 1]
    if (!asset) continue

    drawPageAsset(
      page,
      asset,
      placement.rect.x,
      placement.rect.y,
      placement.rect.width,
      placement.rect.height
    )
  }
}

async function getAssets(
  sourcePdfBytes: Uint8Array,
  totalPages: number,
  outputDoc: PDFDocument
): Promise<PageAsset[]> {
  const vector = await tryEmbedVector(sourcePdfBytes, outputDoc)
  if (vector) return vector
  return embedRaster(sourcePdfBytes, totalPages, outputDoc)
}

export async function buildPreviewPage(
  sourcePdfBytes: Uint8Array,
  config: BookbinderConfig,
  sourcePageSize: { width: number; height: number },
  sourceName?: string
): Promise<Uint8Array> {
  const outputDoc = await PDFDocument.create()
  if (sourceName) outputDoc.setTitle(`Preview ${sourceName}`)

  const tempDoc = await PDFDocument.load(copyBytes(sourcePdfBytes), {
    ignoreEncryption: true,
  })
  const totalPages = tempDoc.getPageCount()

  const allSheets = computeBookletSheets(totalPages)
  const sides = flattenSheets(allSheets)

  if (sides.length === 0) return outputDoc.save({ useObjectStreams: false })

  const firstSide = sides[0]
  const neededNums = [firstSide.left, firstSide.right].filter((p) => p > 0)
  const maxNeeded = Math.max(...neededNums, 0)

  const assets = await getAssets(sourcePdfBytes, maxNeeded, outputDoc)
  const layout = calculateLayout(config, sourcePageSize)

  renderSide(outputDoc, assets, firstSide, layout)

  return outputDoc.save({ useObjectStreams: false })
}

export async function buildFullBooklet(
  sourcePdfBytes: Uint8Array,
  config: BookbinderConfig,
  sourcePageSize: { width: number; height: number },
  sourceName?: string
): Promise<Uint8Array> {
  const tempDoc = await PDFDocument.load(copyBytes(sourcePdfBytes), {
    ignoreEncryption: true,
  })
  const totalPages = tempDoc.getPageCount()

  const outputDoc = await PDFDocument.create()
  if (sourceName) outputDoc.setTitle(`Bound ${sourceName}`)
  const sheets = computeBookletSheets(totalPages)
  const sides = flattenSheets(sheets)

  const assets = await getAssets(sourcePdfBytes, totalPages, outputDoc)
  const layout = calculateLayout(config, sourcePageSize)

  for (const side of sides) {
    renderSide(outputDoc, assets, side, layout)
  }

  return outputDoc.save({ useObjectStreams: false })
}
