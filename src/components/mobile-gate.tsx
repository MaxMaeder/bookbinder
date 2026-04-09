import { useEffect, useState } from "react"
import { BookOpen } from "lucide-react"

const MIN_WIDTH = 1024

export function MobileGate({ children }: { children: React.ReactNode }) {
  const [tooSmall, setTooSmall] = useState(false)

  useEffect(() => {
    const check = () => setTooSmall(window.innerWidth < MIN_WIDTH)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  if (tooSmall) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-8 text-center">
        <BookOpen className="size-16 text-muted-foreground" />
        <div className="max-w-sm space-y-2">
          <h1 className="text-xl font-semibold">
            Max&apos;s Book Bindery
          </h1>
          <p className="text-muted-foreground">
            This app works best on a desktop or laptop computer. Please open it
            on a larger screen for the full experience.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
