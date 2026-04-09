import { useStore } from "@/store"
import { MobileGate } from "@/components/mobile-gate"
import { UploadPage } from "@/components/upload-page"
import { ConfigurePage } from "@/components/configure-page"
import { ResultPage } from "@/components/result-page"
import { Analytics } from "@vercel/analytics/react";

export function App() {
  const step = useStore((s) => s.step)

  return (
    <MobileGate>
      {step === "upload" && <UploadPage />}
      {step === "configure" && <ConfigurePage />}
      {step === "result" && <ResultPage />}
      <Analytics />
    </MobileGate>
  )
}

export default App
