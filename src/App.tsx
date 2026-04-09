import { useStore } from "@/store"
import { MobileGate } from "@/components/mobile-gate"
import { UploadPage } from "@/components/upload-page"
import { ConfigurePage } from "@/components/configure-page"
import { ResultPage } from "@/components/result-page"

export function App() {
  const step = useStore((s) => s.step)

  return (
    <MobileGate>
      {step === "upload" && <UploadPage />}
      {step === "configure" && <ConfigurePage />}
      {step === "result" && <ResultPage />}
    </MobileGate>
  )
}

export default App
