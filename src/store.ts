import { create } from "zustand"
import { type BookbinderConfig, DEFAULT_CONFIG } from "@/lib/constants"

export type AppStep = "upload" | "configure" | "result"

interface BookbinderState {
  step: AppStep
  sourcePdfBytes: Uint8Array | null
  sourcePdfName: string
  sourcePageCount: number
  sourcePageSize: { width: number; height: number }

  config: BookbinderConfig

  resultPdfBytes: Uint8Array | null

  setStep: (step: AppStep) => void
  setSourcePdf: (
    bytes: ArrayBuffer,
    name: string,
    pageCount: number,
    pageSize: { width: number; height: number }
  ) => void
  updateConfig: (partial: Partial<BookbinderConfig>) => void
  setResult: (bytes: Uint8Array) => void
  reset: () => void
}

export const useStore = create<BookbinderState>((set) => ({
  step: "upload",
  sourcePdfBytes: null,
  sourcePdfName: "",
  sourcePageCount: 0,
  sourcePageSize: { width: 612, height: 792 },

  config: { ...DEFAULT_CONFIG },

  resultPdfBytes: null,

  setStep: (step) => set({ step }),

  setSourcePdf: (bytes, name, pageCount, pageSize) =>
    set({
      sourcePdfBytes: new Uint8Array(bytes).slice(),
      sourcePdfName: name,
      sourcePageCount: pageCount,
      sourcePageSize: pageSize,
      step: "configure",
    }),

  updateConfig: (partial) =>
    set((state) => ({
      config: { ...state.config, ...partial },
    })),

  setResult: (bytes) =>
    set({ resultPdfBytes: bytes, step: "result" }),

  reset: () =>
    set({
      step: "upload",
      sourcePdfBytes: null,
      sourcePdfName: "",
      sourcePageCount: 0,
      sourcePageSize: { width: 612, height: 792 },
      config: { ...DEFAULT_CONFIG },
      resultPdfBytes: null,
    }),
}))
