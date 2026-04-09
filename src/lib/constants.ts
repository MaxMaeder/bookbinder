export const POINTS_PER_INCH = 72

export interface PageSizeOption {
  label: string
  /** Width in inches (landscape orientation) */
  width: number
  /** Height in inches (landscape orientation) */
  height: number
}

export const PAGE_SIZES: PageSizeOption[] = [
  { label: "US Letter", width: 11, height: 8.5 },
  { label: "US Legal", width: 14, height: 8.5 },
  { label: "A4", width: 11.69, height: 8.27 },
  { label: "A3", width: 16.54, height: 11.69 },
  { label: "Tabloid", width: 17, height: 11 },
]

export interface BookbinderConfig {
  pageSize: PageSizeOption
  smallerBook: {
    enabled: boolean
    width: number
    height: number
    cutLines: boolean
  }
  signatures: {
    enabled: boolean
    sheetsPerSignature: number
  }
  bindingWidth: number
  margins: {
    enabled: boolean
    top: number
    bottom: number
    left: number
    right: number
  }
}

export const DEFAULT_CONFIG: BookbinderConfig = {
  pageSize: PAGE_SIZES[0],
  smallerBook: {
    enabled: false,
    width: 8.5,
    height: 5.5,
    cutLines: true,
  },
  signatures: {
    enabled: false,
    sheetsPerSignature: 4,
  },
  bindingWidth: 0.25,
  margins: {
    enabled: false,
    top: 0.15,
    bottom: 0.15,
    left: 0.15,
    right: 0.15,
  },
}
