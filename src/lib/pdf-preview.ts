import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"
import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export async function getPdfInfo(
  pdfBytes: ArrayBuffer
): Promise<{
  pageCount: number
  pageSize: { width: number; height: number }
}> {
  const copy = new Uint8Array(pdfBytes).slice()
  const loadingTask = pdfjsLib.getDocument({ data: copy })
  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  pdf.destroy()
  return {
    pageCount,
    pageSize: { width: viewport.width, height: viewport.height },
  }
}
