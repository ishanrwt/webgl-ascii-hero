"use client"

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react"
import { EffectScene, LOOP_ROTATION_MS } from "./effect-scene"
import { EditorControls } from "./editor-controls"
import {
  DEFAULT_ASCII_SETTINGS,
  MAX_MODEL_BYTES,
  WARN_MODEL_BYTES,
  formatBytes,
  loadSavedDefaultSettings,
  type AsciiEditorSettings,
} from "../lib/ascii-settings"

type LoadedModel = {
  url: string
  name: string
  size: number
}

export function Hero() {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [settings, setSettings] = useState<AsciiEditorSettings>(DEFAULT_ASCII_SETTINGS)
  const [model, setModel] = useState<LoadedModel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [exportNote, setExportNote] = useState<string | null>(null)
  const [codeExportOpen, setCodeExportOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [pngInfoOpen, setPngInfoOpen] = useState(false)
  const [codeInfoOpen, setCodeInfoOpen] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    setSettings(loadSavedDefaultSettings())
  }, [])

  useEffect(() => {
    return () => {
      if (model?.url) URL.revokeObjectURL(model.url)
    }
  }, [model?.url])

  const loadFile = useCallback((file: File | undefined | null) => {
    if (!file) return

    setError(null)
    setWarning(null)

    const lower = file.name.toLowerCase()
    if (!lower.endsWith(".glb")) {
      setError("Only .glb files are supported.")
      return
    }

    if (file.size > MAX_MODEL_BYTES) {
      setError(`Model is too large (${formatBytes(file.size)}). Max is 50 MB.`)
      return
    }

    if (file.size > WARN_MODEL_BYTES) {
      setWarning(
        `Large file (${formatBytes(file.size)}). It may run slowly on some devices.`
      )
    }

    const url = URL.createObjectURL(file)
    setModel((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url)
      return { url, name: file.name, size: file.size }
    })
  }, [])

  const clearModel = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop()
      } catch {
        // ignore
      }
    }
    setIsRecording(false)
    setCodeExportOpen(false)
    setIsPaused(false)
    setPngInfoOpen(false)
    setCodeInfoOpen(false)
    setModel((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url)
      return null
    })
    setError(null)
    setWarning(null)
    setExportNote(null)
    if (inputRef.current) inputRef.current.value = ""
  }, [])

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const exportPng = useCallback(() => {
    const canvas = previewRef.current?.querySelector("canvas")
    if (!canvas) {
      setExportNote("Load a model before exporting an image.")
      return
    }
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          setExportNote("Could not export image from the canvas.")
          return
        }
        const base = model?.name.replace(/\.glb$/i, "") || "ascii-model"
        downloadBlob(blob, `${base}-ascii.png`)
        setExportNote("PNG downloaded.")
      }, "image/png")
    } catch {
      setExportNote("Could not export image from the canvas.")
    }
  }, [downloadBlob, model?.name])

  const exportSettings = useCallback(() => {
    const payload = {
      modelName: model?.name ?? null,
      settings,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    })
    downloadBlob(blob, "ascii-settings.json")
    setExportNote("Settings JSON downloaded.")
  }, [downloadBlob, model?.name, settings])

  const copySettings = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(settings, null, 2))
      setExportNote("Settings copied to clipboard.")
    } catch {
      setExportNote("Could not copy settings.")
    }
  }, [settings])

  const exportVideo = useCallback(async () => {
    if (isRecording) return

    const canvas = previewRef.current?.querySelector("canvas")
    if (!canvas) {
      setExportNote("Load a model before recording video.")
      return
    }

    if (typeof MediaRecorder === "undefined" || !canvas.captureStream) {
      setExportNote("Video export is not supported in this browser.")
      return
    }

    const stream = canvas.captureStream(30)
    const preferredTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ]
    const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type))

    if (!mimeType) {
      setExportNote("No supported video format found in this browser.")
      stream.getTracks().forEach((track) => track.stop())
      return
    }

    const chunks: BlobPart[] = []
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5_000_000,
      })
    } catch {
      setExportNote("Could not start video recording.")
      stream.getTracks().forEach((track) => track.stop())
      return
    }

    recorderRef.current = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }

    recorder.onerror = () => {
      setIsRecording(false)
      setExportNote("Video recording failed.")
      stream.getTracks().forEach((track) => track.stop())
      recorderRef.current = null
    }

    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop())
      recorderRef.current = null
      setIsRecording(false)

      if (!chunks.length) {
        setExportNote("Recording produced an empty file.")
        return
      }

      const blob = new Blob(chunks, { type: mimeType })
      const base = model?.name.replace(/\.glb$/i, "") || "ascii-model"
      downloadBlob(blob, `${base}-ascii.webm`)
      setExportNote(`Video downloaded (WebM, ${(LOOP_ROTATION_MS / 1000).toFixed(1)}s loop).`)
    }

    setIsRecording(true)
    setIsPaused(false)
    setExportNote(`Recording ${(LOOP_ROTATION_MS / 1000).toFixed(1)}s loop…`)
    recorder.start()

    window.setTimeout(() => {
      if (recorder.state !== "inactive") {
        recorder.stop()
      }
    }, LOOP_ROTATION_MS)
  }, [downloadBlob, isRecording, model?.name])

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      loadFile(e.dataTransfer.files?.[0])
    },
    [loadFile]
  )

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--fg)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,255,255,0.08), transparent 55%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(255,255,255,0.04), transparent 50%)",
        }}
      />

      <header className="relative z-10 px-5 pt-6 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <p
            className="animate-fade-up text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ASCII 3D
          </p>
          <p
            className="animate-fade-up text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Browser editor
          </p>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-5rem)] flex-col items-center px-4 pb-10 pt-8 sm:px-8 sm:pt-10">
        <div className="animate-fade-up-delay-1 mb-8 max-w-2xl text-center sm:mb-10">
          <h1
            className="text-balance text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Live ASCII from your 3D model
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Upload a .glb in the browser, tune the shader, and preview instantly.
            Files stay on your device — max 50 MB.
          </p>
        </div>

        <div className="animate-fade-up-delay-2 grid w-full max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="relative">
            <div
              aria-hidden
              className="preview-glow pointer-events-none absolute -inset-6 rounded-[2rem] bg-white/[0.04] blur-2xl sm:-inset-8"
            />

            <div
              ref={previewRef}
              className={`relative flex h-[min(52vh,420px)] w-full flex-col overflow-hidden rounded-2xl border bg-[var(--bg-elevated)] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_40px_80px_-40px_rgba(0,0,0,0.9)] sm:h-[min(68vh,720px)] sm:rounded-3xl ${
                dragging ? "border-white" : "border-[var(--line-strong)]"
              }`}
              onDragEnter={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                if (e.currentTarget.contains(e.relatedTarget as Node)) return
                setDragging(false)
              }}
              onDrop={onDrop}
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-white/25" />
                  <span className="h-2 w-2 rounded-full bg-white/25" />
                  <span className="h-2 w-2 rounded-full bg-white/25" />
                </div>
                <p
                  className="truncate text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {model ? `Preview · ${model.name}` : "Preview · empty"}
                </p>
                <p
                  className="shrink-0 text-[10px] text-[var(--muted)]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {model ? formatBytes(model.size) : ".glb · 50 MB"}
                </p>
              </div>

              <div className="relative min-h-0 flex-1">
                {model ? (
                  <EffectScene
                    className="absolute inset-0 h-full w-full"
                    enableZoom={false}
                    modelUrl={model.url}
                    settings={settings}
                    lockForLoop={isRecording}
                    paused={isPaused}
                  />
                ) : (
                  <div className="relative flex h-full min-h-[min(44vh,360px)] flex-col items-center justify-center px-6 py-12 text-center sm:min-h-[min(60vh,640px)] sm:py-16">
                    <div
                      aria-hidden
                      className="preview-grid pointer-events-none absolute inset-0 opacity-[0.06]"
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
                        backgroundSize: "48px 48px",
                      }}
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(circle at center, transparent 20%, rgba(5,5,5,0.85) 100%)",
                      }}
                    />

                    <div className="relative z-10 flex flex-col items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-white/30">
                        <span
                          className="text-xl text-white/50"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          +
                        </span>
                      </div>
                      <p
                        className="text-xl font-medium tracking-tight sm:text-2xl"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {dragging ? "Drop to load" : "No model loaded"}
                      </p>
                      <p className="max-w-sm text-sm leading-relaxed text-[var(--muted)]">
                        Drag a .glb here or choose a file. Processing stays in
                        your browser.
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => inputRef.current?.click()}
                          className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                        >
                          Upload .glb
                        </button>
                        <span className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-[var(--muted)]">
                          Max 50 MB
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {model && (
                  <button
                    type="button"
                    onClick={() => setIsPaused((p) => !p)}
                    disabled={isRecording}
                    className="absolute left-4 top-4 z-20 rounded-full border border-white/20 bg-black/75 px-3.5 py-1.5 text-[11px] text-white/90 backdrop-blur-sm transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {isPaused ? "Play" : "Pause"}
                  </button>
                )}

                {model && (
                  <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2">
                    <p
                      className="rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[11px] text-white/70 backdrop-blur-sm"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {isPaused
                        ? "Paused · drag to frame · then export PNG"
                        : "Drag to rotate · hover to spin faster"}
                    </p>
                    <button
                      type="button"
                      onClick={clearModel}
                      className="pointer-events-auto rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-[11px] text-white/80 backdrop-blur-sm transition hover:border-white/40 hover:text-white"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      Clear model
                    </button>
                  </div>
                )}
              </div>
            </div>

            {(error || warning) && (
              <p
                className={`mt-3 text-center text-sm ${
                  error ? "text-white" : "text-[var(--muted)]"
                }`}
              >
                {error ?? warning}
              </p>
            )}
          </div>

          <aside className="rounded-2xl border border-[var(--line-strong)] bg-[var(--bg-elevated)] p-5 sm:rounded-3xl lg:max-h-[min(68vh,720px)] lg:overflow-y-auto">
            <div className="mb-6 space-y-3">
              <input
                ref={inputRef}
                type="file"
                accept=".glb,model/gltf-binary"
                className="hidden"
                onChange={(e) => loadFile(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
              >
                {model ? "Replace model" : "Upload .glb"}
              </button>
              {model && (
                <button
                  type="button"
                  onClick={clearModel}
                  className="w-full rounded-full border border-white/20 px-4 py-2.5 text-sm text-[var(--muted)] transition hover:border-white/40 hover:text-white"
                >
                  Clear
                </button>
              )}
              <div className="space-y-2 border-t border-[var(--line)] pt-4">
                <p
                  className="text-[10px] uppercase tracking-[0.16em] text-white/35"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Export
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!model || isRecording}
                    onClick={exportPng}
                    className="min-w-0 flex-1 rounded-full border border-white bg-transparent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    PNG
                  </button>
                  <button
                    type="button"
                    aria-label="PNG export tip"
                    aria-expanded={pngInfoOpen}
                    onClick={() => setPngInfoOpen((open) => !open)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 text-sm text-white/70 transition hover:border-white/50 hover:text-white"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    i
                  </button>
                </div>
                {pngInfoOpen && (
                  <p
                    className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-[11px] leading-relaxed text-[var(--muted)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Pause the model (top-left of the preview) before downloading
                    a PNG so the frame stays sharp and still.
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCodeExportOpen((open) => !open)}
                    className="min-w-0 flex-1 rounded-full border border-white/20 px-4 py-2.5 text-sm text-[var(--muted)] transition hover:border-white/40 hover:text-white"
                  >
                    {codeExportOpen ? "Code export ▴" : "Code export ▾"}
                  </button>
                  <button
                    type="button"
                    aria-label="Code export tip"
                    aria-expanded={codeInfoOpen}
                    onClick={() => setCodeInfoOpen((open) => !open)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 text-sm text-white/70 transition hover:border-white/50 hover:text-white"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    i
                  </button>
                </div>
                {codeInfoOpen && (
                  <p
                    className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-[11px] leading-relaxed text-[var(--muted)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Use this to reuse your look in another project.{" "}
                    <span className="text-white/80">Export settings</span> downloads
                    a JSON file of your controls.{" "}
                    <span className="text-white/80">Copy settings</span> puts the
                    same JSON on your clipboard so you can paste it into code or
                    notes.
                  </p>
                )}
                {codeExportOpen && (
                  <div className="space-y-2 rounded-2xl border border-white/10 bg-black/40 p-3">
                    <button
                      type="button"
                      onClick={exportSettings}
                      className="w-full rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
                    >
                      Export settings
                    </button>
                    <button
                      type="button"
                      onClick={copySettings}
                      className="w-full rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
                    >
                      Copy settings
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  disabled={!model || isRecording}
                  onClick={exportVideo}
                  className="w-full rounded-full border border-white/20 px-4 py-2.5 text-sm text-[var(--muted)] transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isRecording ? "Recording…" : "Video download"}
                </button>
              </div>
              {exportNote && (
                <p
                  className="text-center text-[11px] text-[var(--muted)]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {exportNote}
                </p>
              )}
            </div>

            <EditorControls
              settings={settings}
              onChange={setSettings}
              disabled={!model}
            />
          </aside>
        </div>

        <section className="mt-14 w-full max-w-3xl border-t border-[var(--line)] pt-10 text-center sm:mt-16">
          <h2
            className="mb-6 text-sm uppercase tracking-[0.2em] text-[var(--muted)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Credit
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-[var(--muted)]">
            <p>
              Original WebGL ASCII hero by{" "}
              <a
                href="https://github.com/egorshest"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white"
              >
                Egor Shesternin
              </a>
              . Support on{" "}
              <a
                href="https://buymeacoffee.com/egorbuilds"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white"
              >
                Buy Me a Coffee
              </a>
              .
            </p>
            <p>
              Browser features by{" "}
              <a
                href="https://github.com/ishanrwt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white"
              >
                Ishan
              </a>
              {" · "}
              <a
                href="https://www.instagram.com/raishancard/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white"
              >
                @raishancard
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
