import { useCallback, useRef, useState } from "react"
import { Upload, FileText } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useStore } from "@/store"
import { getPdfInfo } from "@/lib/pdf-preview"

const SAMPLES = [
  {
    name: "Short Story (4 pages)",
    file: "/samples/sample-short.pdf",
  },
  {
    name: "Longer Document (16 pages)",
    file: "/samples/sample-long.pdf",
  },
]

export function UploadPage() {
  const setSourcePdf = useStore((s) => s.setSourcePdf)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadPdf = useCallback(
    async (bytes: ArrayBuffer, name: string) => {
      setLoading(true)
      try {
        const { pageCount, pageSize } = await getPdfInfo(bytes)
        setSourcePdf(bytes, name, pageCount, pageSize)
      } catch (err) {
        console.error("Failed to load PDF:", err)
        alert("Could not read that PDF. Please try another file.")
      } finally {
        setLoading(false)
      }
    },
    [setSourcePdf]
  )

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== "application/pdf") {
        alert("Please select a PDF file.")
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          loadPdf(reader.result, file.name)
        }
      }
      reader.readAsArrayBuffer(file)
    },
    [loadPdf]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleSample = useCallback(
    async (sample: (typeof SAMPLES)[number]) => {
      setLoading(true)
      try {
        const res = await fetch(sample.file)
        const bytes = await res.arrayBuffer()
        await loadPdf(bytes, sample.name)
      } catch (err) {
        console.error("Failed to fetch sample:", err)
        alert("Could not load sample PDF.")
        setLoading(false)
      }
    },
    [loadPdf]
  )

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-10 p-8">
      <div className="flex flex-col items-center gap-3">
        <img src="/logo.svg" alt="Max's Book Bindery" className="h-14" />
        <p className="text-muted-foreground">
          Turn any PDF into a printable saddle-stitched booklet.
        </p>
      </div>

      <div
        className={`flex w-full max-w-lg cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed p-10 transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-8 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium">
            {loading ? "Loading..." : "Drop a PDF here or click to browse"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a PDF exported from your word processor
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">Or try a sample</p>
        <div className="flex gap-3">
          {SAMPLES.map((sample) => (
            <Card
              key={sample.file}
              className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
              onClick={() => handleSample(sample)}
            >
              <FileText className="size-5 shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium">{sample.name}</span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
