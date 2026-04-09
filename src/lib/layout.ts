import { type BookbinderConfig, POINTS_PER_INCH } from "./constants"

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface PagePlacement {
  /** Where on the output page the source PDF page is drawn */
  rect: Rect
  /** Uniform scale factor applied to the source page */
  scale: number
}

export interface LayoutResult {
  /** Full output page dimensions in points */
  page: { width: number; height: number }
  /** The book area (smaller area if enabled, otherwise same as page) */
  bookArea: Rect
  /** Left half-panel (before margins) */
  leftPanel: Rect
  /** Right half-panel (before margins) */
  rightPanel: Rect
  /** Left content area (after margins) */
  leftContent: Rect
  /** Right content area (after margins) */
  rightContent: Rect
  /** Where the left source page is placed (object-fit: contain) */
  leftPage: PagePlacement
  /** Where the right source page is placed (object-fit: contain) */
  rightPage: PagePlacement
  /** Cut line rectangles, if enabled */
  cutLines: Rect | null
}

function inchToPt(inches: number): number {
  return inches * POINTS_PER_INCH
}

function fitContain(
  containerWidth: number,
  containerHeight: number,
  sourceWidth: number,
  sourceHeight: number
): PagePlacement {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { rect: { x: 0, y: 0, width: 0, height: 0 }, scale: 0 }
  }

  const scaleX = containerWidth / sourceWidth
  const scaleY = containerHeight / sourceHeight
  const scale = Math.min(scaleX, scaleY)

  const fitWidth = sourceWidth * scale
  const fitHeight = sourceHeight * scale

  return {
    rect: {
      x: (containerWidth - fitWidth) / 2,
      y: (containerHeight - fitHeight) / 2,
      width: fitWidth,
      height: fitHeight,
    },
    scale,
  }
}

export function calculateLayout(
  config: BookbinderConfig,
  sourcePageSize: { width: number; height: number }
): LayoutResult {
  const pageWidth = inchToPt(config.pageSize.width)
  const pageHeight = inchToPt(config.pageSize.height)

  let bookArea: Rect
  if (config.smallerBook.enabled) {
    const bw = inchToPt(config.smallerBook.width)
    const bh = inchToPt(config.smallerBook.height)
    bookArea = {
      x: (pageWidth - bw) / 2,
      y: (pageHeight - bh) / 2,
      width: bw,
      height: bh,
    }
  } else {
    bookArea = { x: 0, y: 0, width: pageWidth, height: pageHeight }
  }

  const bindingPt = inchToPt(config.bindingWidth)
  const halfPanelWidth = (bookArea.width - bindingPt) / 2

  const leftPanel: Rect = {
    x: bookArea.x,
    y: bookArea.y,
    width: halfPanelWidth,
    height: bookArea.height,
  }

  const rightPanel: Rect = {
    x: bookArea.x + halfPanelWidth + bindingPt,
    y: bookArea.y,
    width: halfPanelWidth,
    height: bookArea.height,
  }

  const ml = config.margins.enabled ? inchToPt(config.margins.left) : 0
  const mr = config.margins.enabled ? inchToPt(config.margins.right) : 0
  const mt = config.margins.enabled ? inchToPt(config.margins.top) : 0
  const mb = config.margins.enabled ? inchToPt(config.margins.bottom) : 0

  const leftContent: Rect = {
    x: leftPanel.x + ml,
    y: leftPanel.y + mb,
    width: leftPanel.width - ml - mr,
    height: leftPanel.height - mt - mb,
  }

  const rightContent: Rect = {
    x: rightPanel.x + ml,
    y: rightPanel.y + mb,
    width: rightPanel.width - ml - mr,
    height: rightPanel.height - mt - mb,
  }

  const leftFit = fitContain(
    leftContent.width,
    leftContent.height,
    sourcePageSize.width,
    sourcePageSize.height
  )
  const rightFit = fitContain(
    rightContent.width,
    rightContent.height,
    sourcePageSize.width,
    sourcePageSize.height
  )

  const leftPage: PagePlacement = {
    rect: {
      x: leftContent.x + leftFit.rect.x,
      y: leftContent.y + leftFit.rect.y,
      width: leftFit.rect.width,
      height: leftFit.rect.height,
    },
    scale: leftFit.scale,
  }

  const rightPage: PagePlacement = {
    rect: {
      x: rightContent.x + rightFit.rect.x,
      y: rightContent.y + rightFit.rect.y,
      width: rightFit.rect.width,
      height: rightFit.rect.height,
    },
    scale: rightFit.scale,
  }

  const cutLines =
    config.smallerBook.enabled && config.smallerBook.cutLines
      ? { ...bookArea }
      : null

  return {
    page: { width: pageWidth, height: pageHeight },
    bookArea,
    leftPanel,
    rightPanel,
    leftContent,
    rightContent,
    leftPage,
    rightPage,
    cutLines,
  }
}
