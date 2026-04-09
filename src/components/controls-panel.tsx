import { useStore } from "@/store"
import { PAGE_SIZES, type BookbinderConfig } from "@/lib/constants"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { buildFullBooklet } from "@/lib/pdf-engine"
import { useState } from "react"
import { Loader2 } from "lucide-react"

function NumberField({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  max,
  step = 0.05,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="min-w-20 shrink-0 text-xs">{label}</Label>
      <div className="relative flex-1">
        <Input
          type="number"
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v)) onChange(v)
          }}
          min={min}
          max={max}
          step={step}
          className="pr-8"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

export function ControlsPanel() {
  const config = useStore((s) => s.config)
  const updateConfig = useStore((s) => s.updateConfig)
  const sourcePdfBytes = useStore((s) => s.sourcePdfBytes)
  const sourcePdfName = useStore((s) => s.sourcePdfName)
  const sourcePageCount = useStore((s) => s.sourcePageCount)
  const sourcePageSize = useStore((s) => s.sourcePageSize)
  const setResult = useStore((s) => s.setResult)
  const reset = useStore((s) => s.reset)
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!sourcePdfBytes) return
    setGenerating(true)
    try {
      const bytes = await buildFullBooklet(
        sourcePdfBytes,
        config,
        sourcePageSize,
        sourcePdfName
      )
      setResult(bytes)
    } catch (err) {
      console.error("Failed to generate booklet:", err)
      alert("Failed to generate booklet. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  const updateMargin = (
    side: keyof BookbinderConfig["margins"],
    value: number
  ) => {
    updateConfig({ margins: { ...config.margins, [side]: value } })
  }

  const updateSmallerBook = (
    partial: Partial<BookbinderConfig["smallerBook"]>
  ) => {
    updateConfig({ smallerBook: { ...config.smallerBook, ...partial } })
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Configure Booklet</h2>
          <Button variant="ghost" size="sm" onClick={reset}>
            Start Over
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {sourcePdfName} &mdash; {sourcePageCount} page
          {sourcePageCount !== 1 ? "s" : ""}
        </p>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label>Print Page Size</Label>
        <Select
          value={config.pageSize.label}
          onValueChange={(label) => {
            const size = PAGE_SIZES.find((s) => s.label === label)
            if (size) updateConfig({ pageSize: size })
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s.label} value={s.label}>
                {s.label} ({s.width}&Prime; &times; {s.height}&Prime;)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="smaller-book"
            checked={config.smallerBook.enabled}
            onCheckedChange={(v) =>
              updateSmallerBook({ enabled: v === true })
            }
          />
          <Label htmlFor="smaller-book">Smaller book size</Label>
        </div>

        {config.smallerBook.enabled && (
          <div className="space-y-2 pl-6">
            <NumberField
              label="Width"
              value={config.smallerBook.width}
              onChange={(v) => updateSmallerBook({ width: v })}
              suffix="in"
              step={0.25}
            />
            <NumberField
              label="Height"
              value={config.smallerBook.height}
              onChange={(v) => updateSmallerBook({ height: v })}
              suffix="in"
              step={0.25}
            />
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="cut-lines"
                checked={config.smallerBook.cutLines}
                onCheckedChange={(v) =>
                  updateSmallerBook({ cutLines: v === true })
                }
              />
              <Label htmlFor="cut-lines" className="text-xs">
                Print cut lines
              </Label>
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <Label>Binding Width</Label>
        <NumberField
          label="Gap"
          value={config.bindingWidth}
          onChange={(v) => updateConfig({ bindingWidth: v })}
          suffix="in"
          step={0.05}
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <Label>Page Margins</Label>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Top"
            value={config.margins.top}
            onChange={(v) => updateMargin("top", v)}
            suffix="in"
          />
          <NumberField
            label="Bottom"
            value={config.margins.bottom}
            onChange={(v) => updateMargin("bottom", v)}
            suffix="in"
          />
          <NumberField
            label="Left"
            value={config.margins.left}
            onChange={(v) => updateMargin("left", v)}
            suffix="in"
          />
          <NumberField
            label="Right"
            value={config.margins.right}
            onChange={(v) => updateMargin("right", v)}
            suffix="in"
          />
        </div>
      </div>

      <div className="mt-auto pt-4">
        <Button
          className="w-full"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating && <Loader2 className="animate-spin" />}
          {generating ? "Generating..." : "Generate Booklet"}
        </Button>
      </div>
    </div>
  )
}
