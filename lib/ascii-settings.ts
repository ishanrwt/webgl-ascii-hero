export const MAX_MODEL_BYTES = 50 * 1024 * 1024
export const WARN_MODEL_BYTES = 30 * 1024 * 1024

export const SETTINGS_STORAGE_KEY = "ascii-3d-default-settings"

export type AsciiEditorSettings = {
  cellSize: number
  tintColor: string
  backgroundColor: string
  contrastAdjust: number
  brightnessAdjust: number
  invert: boolean
  volumeShading: boolean
  modelScale: number
  modelY: number
  cameraZ: number
  ambientIntensity: number
  keyLightIntensity: number
  fillLightIntensity: number
}

/** Locked look from the tuned localhost preview. */
export const DEFAULT_ASCII_SETTINGS: AsciiEditorSettings = {
  cellSize: 4.5,
  tintColor: "#E8E8E8",
  backgroundColor: "#000000",
  contrastAdjust: 0.4,
  brightnessAdjust: -0.5,
  invert: true,
  volumeShading: true,
  modelScale: 3.5,
  modelY: -3.3,
  cameraZ: 7.5,
  ambientIntensity: 0.02,
  keyLightIntensity: 5.5,
  fillLightIntensity: 1.4,
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function loadSavedDefaultSettings(): AsciiEditorSettings {
  if (typeof window === "undefined") return { ...DEFAULT_ASCII_SETTINGS }
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_ASCII_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AsciiEditorSettings>
    return { ...DEFAULT_ASCII_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_ASCII_SETTINGS }
  }
}

export function saveDefaultSettings(settings: AsciiEditorSettings): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

export function clearSavedDefaultSettings(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(SETTINGS_STORAGE_KEY)
}
