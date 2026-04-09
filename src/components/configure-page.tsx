import { ControlsPanel } from "./controls-panel"
import { PreviewPanel } from "./preview-panel"

export function ConfigurePage() {
  return (
    <div className="grid h-svh grid-cols-[minmax(340px,_2fr)_5fr]">
      <div className="border-r">
        <ControlsPanel />
      </div>
      <PreviewPanel />
    </div>
  )
}
