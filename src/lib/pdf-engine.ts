import {
  PDFDocument,
  type PDFEmbeddedPage,
  type PDFImage,
  rgb,
  LineCapStyle,
} from "pdf-lib"
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"
import { type BookbinderConfig } from "./constants"
import { calculateLayout, type LayoutResult } from "./layout"
import {
  computeSheets,
  flattenSheets,
  type SheetSide,
} from "./booklet"

type PageAsset =
  | { kind: "vector"; page: PDFEmbeddedPage }
  | { kind: "raster"; image: PDFImage }

type AssetMap = Map<number, PageAsset>

const RASTER_DPI = 200
const RASTER_SCALE = RASTER_DPI / 72

function copyBytes(src: Uint8Array): Uint8Array {
  const copy = new Uint8Array(src.length)
  copy.set(src)
  return copy
}

/** Collect all unique 1-indexed page numbers referenced by a set of sides. */
function collectNeededPages(sides: SheetSide[]): number[] {
  const set = new Set<number>()
  for (const side of sides) {
    if (side.left > 0) set.add(side.left)
    if (side.right > 0) set.add(side.right)
  }
  return [...set].sort((a, b) => a - b)
}

/**
 * Try to embed pages directly via pdf-lib (vector quality).
 * Returns null if the PDF is encrypted / can't be loaded.
 */
async function tryEmbedVector(
  sourcePdfBytes: Uint8Array,
  pageNums: number[],
  outputDoc: PDFDocument
): Promise<AssetMap | null> {
  try {
    const sourceDoc = await PDFDocument.load(copyBytes(sourcePdfBytes))
    const allPages = sourceDoc.getPages()
    const indices = pageNums.map((n) => n - 1)
    const toEmbed = indices.map((i) => allPages[i])
    const embedded = await outputDoc.embedPages(toEmbed)

    const map: AssetMap = new Map()
    for (let i = 0; i < pageNums.length; i++) {
      map.set(pageNums[i], { kind: "vector", page: embedded[i] })
    }
    return map
  } catch {
    return null
  }
}

/**
 * Render specific pages to images via pdfjs-dist (raster fallback).
 */
async function embedRaster(
  sourcePdfBytes: Uint8Array,
  pageNums: number[],
  outputDoc: PDFDocument
): Promise<AssetMap> {
  const loadingTask = pdfjsLib.getDocument({
    data: copyBytes(sourcePdfBytes),
  })
  const pdf = await loadingTask.promise
  const map: AssetMap = new Map()

  for (const num of pageNums) {
    const page = await pdf.getPage(num)
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
    map.set(num, { kind: "raster", image })
  }

  pdf.destroy()
  return map
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
  assets: AssetMap,
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

    const asset = assets.get(pageNum)
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
  pageNums: number[],
  outputDoc: PDFDocument
): Promise<AssetMap> {
  if (pageNums.length === 0) return new Map()
  const vector = await tryEmbedVector(sourcePdfBytes, pageNums, outputDoc)
  if (vector) return vector
  return embedRaster(sourcePdfBytes, pageNums, outputDoc)
}

export async function buildPreviewPage(
  sourcePdfBytes: Uint8Array,
  config: BookbinderConfig,
  sourcePageSize: { width: number; height: number },
  side: SheetSide
): Promise<Uint8Array> {
  const outputDoc = await PDFDocument.create()

  const pageNums = collectNeededPages([side])
  if (pageNums.length === 0)
    return outputDoc.save({ useObjectStreams: false })

  const assets = await getAssets(sourcePdfBytes, pageNums, outputDoc)
  const layout = calculateLayout(config, sourcePageSize)

  renderSide(outputDoc, assets, side, layout)

  return outputDoc.save({ useObjectStreams: false })
}

export async function buildFullBook(
  sourcePdfBytes: Uint8Array,
  config: BookbinderConfig,
  sourcePageSize: { width: number; height: number }
): Promise<Uint8Array> {
  const tempDoc = await PDFDocument.load(copyBytes(sourcePdfBytes), {
    ignoreEncryption: true,
  })
  const totalPages = tempDoc.getPageCount()

  const outputDoc = await PDFDocument.create()
  const sheets = computeSheets(totalPages, config)
  const sides = flattenSheets(sheets)

  const pageNums = collectNeededPages(sides)
  const assets = await getAssets(sourcePdfBytes, pageNums, outputDoc)
  const layout = calculateLayout(config, sourcePageSize)

  for (const side of sides) {
    renderSide(outputDoc, assets, side, layout)
  }

  return outputDoc.save({ useObjectStreams: false })
}
