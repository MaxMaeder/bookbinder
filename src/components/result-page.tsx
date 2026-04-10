import { useCallback, useEffect, useMemo, useState } from "react"
import { useStore } from "@/store"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Download } from "lucide-react"
import { computeSheets } from "@/lib/booklet"

export function ResultPage() {
  const resultPdfBytes = useStore((s) => s.resultPdfBytes)
  const sourcePdfName = useStore((s) => s.sourcePdfName)
  const sourcePageCount = useStore((s) => s.sourcePageCount)
  const config = useStore((s) => s.config)
  const setStep = useStore((s) => s.setStep)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [showTips, setShowTips] = useState(false)

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

  const triggerDownload = useCallback(() => {
    if (!blobUrl) return
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = `Bound ${sourcePdfName}`
    a.click()
  }, [blobUrl, sourcePdfName])

  const handleDownload = useCallback(() => {
    setShowTips(true)
    triggerDownload()
  }, [triggerDownload])

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

      <Dialog open={showTips} onOpenChange={setShowTips}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Printing Tips</DialogTitle>
            <DialogDescription>
              For best results, adjust these settings in your print dialog.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-3 pl-5 text-sm">
            <li>
              <span className="font-medium">Turn on &lsquo;print on both sides&rsquo;</span>
              <p className="mt-0.5 text-muted-foreground">
                This is sometimes called duplex printing.
              </p>
            </li>
            <li>
              <span className="font-medium">Select &lsquo;flip on short side&rsquo;</span>
              <p className="mt-0.5 text-muted-foreground">
                This usually defaults to the long side &mdash; make sure to change it.
              </p>
            </li>
            <li>
              <span className="font-medium">Try a test print first</span>
              <p className="mt-0.5 text-muted-foreground">
                The &lsquo;Simple Example&rsquo; sample is great for this.
              </p>
            </li>
          </ol>
          <DialogFooter>
            <Button onClick={() => setShowTips(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
