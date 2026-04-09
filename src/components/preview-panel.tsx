import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { Loader2 } from "lucide-react"
import { useStore } from "@/store"
import { buildPreviewPage } from "@/lib/pdf-engine"
import { getPreviewSide } from "@/lib/booklet"

export function PreviewPanel() {
  const config = useStore((s) => s.config)
  const sourcePdfBytes = useStore((s) => s.sourcePdfBytes)
  const sourcePageSize = useStore((s) => s.sourcePageSize)
  const sourcePageCount = useStore((s) => s.sourcePageCount)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const renderIdRef = useRef(0)
  const prevUrlRef = useRef<string | null>(null)

  const preview = useMemo(
    () => getPreviewSide(sourcePageCount, config),
    [sourcePageCount, config]
  )

  const renderPreview = useCallback(async () => {
    if (!sourcePdfBytes) return

    const renderId = ++renderIdRef.current
    setRendering(true)
    setError(null)

    try {
      const pdfBytes = await buildPreviewPage(
        sourcePdfBytes,
        config,
        sourcePageSize,
        preview.side
      )

      if (renderId !== renderIdRef.current) return

      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
      const blob = new Blob([pdfBytes as BlobPart], {
        type: "application/pdf",
      })
      const url = URL.createObjectURL(blob)
      prevUrlRef.current = url
      setBlobUrl(url)
    } catch (err) {
      console.error("Preview render failed:", err)
      if (renderId === renderIdRef.current) {
        setError(err instanceof Error ? err.message : "Render failed")
      }
    } finally {
      if (renderId === renderIdRef.current) {
        setRendering(false)
      }
    }
  }, [sourcePdfBytes, config, sourcePageSize, preview.side])

  useEffect(() => {
    const timeout = setTimeout(renderPreview, 200)
    return () => clearTimeout(timeout)
  }, [renderPreview])

  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
    }
  }, [])

  const leftLabel = preview.side.left > 0 ? preview.side.left : "blank"
  const rightLabel = preview.side.right > 0 ? preview.side.right : "blank"

  return (
    <div className="relative flex h-full flex-col bg-muted/30">
      <div className="relative flex-1 flex items-center justify-center p-4">
        {rendering && !blobUrl && (
          <p className="text-sm text-muted-foreground">Rendering...</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {blobUrl && (
          <iframe
            src={blobUrl}
            className="h-full w-full rounded-sm border-0 shadow-lg ring-1 ring-foreground/5"
            title="Book preview"
          />
        )}
        {rendering && blobUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 shadow-sm ring-1 ring-foreground/10">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Updating...</span>
            </div>
          </div>
        )}
      </div>
      <p className="px-4 pb-3 text-xs text-muted-foreground">
        Previewing sheet {preview.sheetIndex + 1} (
        {preview.isFront ? "front" : "back"}) &mdash; pages {leftLabel} and{" "}
        {rightLabel}
      </p>
    </div>
  )
}
