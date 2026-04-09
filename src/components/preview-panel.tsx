import { useEffect, useRef, useState, useCallback } from "react"
import { useStore } from "@/store"
import { buildPreviewPage } from "@/lib/pdf-engine"

export function PreviewPanel() {
  const config = useStore((s) => s.config)
  const sourcePdfBytes = useStore((s) => s.sourcePdfBytes)
  const sourcePdfName = useStore((s) => s.sourcePdfName)
  const sourcePageSize = useStore((s) => s.sourcePageSize)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const renderIdRef = useRef(0)
  const prevUrlRef = useRef<string | null>(null)

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
        sourcePdfName
      )

      if (renderId !== renderIdRef.current) return

      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
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
  }, [sourcePdfBytes, sourcePdfName, config, sourcePageSize])

  useEffect(() => {
    const timeout = setTimeout(renderPreview, 200)
    return () => clearTimeout(timeout)
  }, [renderPreview])

  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
    }
  }, [])

  return (
    <div className="relative flex h-full items-center justify-center bg-muted/30 p-4">
      {rendering && !blobUrl && (
        <p className="text-sm text-muted-foreground">Rendering...</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {blobUrl && (
        <iframe
          src={blobUrl}
          className="h-full w-full rounded-sm border-0 shadow-lg ring-1 ring-foreground/5"
          title="Booklet preview"
        />
      )}
    </div>
  )
}
