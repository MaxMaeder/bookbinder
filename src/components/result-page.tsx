import { useCallback, useEffect, useMemo, useState } from "react"
import { useStore } from "@/store"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download } from "lucide-react"
import { computeSheets } from "@/lib/booklet"

export function ResultPage() {
  const resultPdfBytes = useStore((s) => s.resultPdfBytes)
  const sourcePdfName = useStore((s) => s.sourcePdfName)
  const sourcePageCount = useStore((s) => s.sourcePageCount)
  const config = useStore((s) => s.config)
  const setStep = useStore((s) => s.setStep)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  const sheetCount = useMemo(
    () => computeSheets(sourcePageCount, config).length,
    [sourcePageCount, config]
  )

  useEffect(() => {
    if (!resultPdfBytes) return
    const blob = new Blob([resultPdfBytes as BlobPart], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    setBlobUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [resultPdfBytes])

  const handleDownload = useCallback(() => {
    if (!blobUrl) return
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = `Bound ${sourcePdfName}`
    a.click()
  }, [blobUrl, sourcePdfName])

  if (!resultPdfBytes || !blobUrl) return null

  return (
    <div className="flex h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep("configure")}
          >
            <ArrowLeft />
            Back to Settings
          </Button>
          <span className="text-sm text-muted-foreground">
            {sheetCount} physical sheet{sheetCount !== 1 ? "s" : ""} &middot;{" "}
            {sheetCount * 2} sides to print
          </span>
        </div>
        <Button onClick={handleDownload}>
          <Download />
          Download PDF
        </Button>
      </header>

      <iframe src={blobUrl} className="flex-1 border-0" title="Book PDF" />
    </div>
  )
}
