"use client"

import type { AsciiEditorSettings } from "../lib/ascii-settings"
import {
  DEFAULT_ASCII_SETTINGS,
  clearSavedDefaultSettings,
  saveDefaultSettings,
} from "../lib/ascii-settings"

type EditorControlsProps = {
  settings: AsciiEditorSettings
  onChange: (next: AsciiEditorSettings) => void
  disabled?: boolean
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
  display,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  disabled?: boolean
  display?: string
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span
          className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {label}
        </span>
        <span
          className="text-[11px] text-white/70"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {display ?? value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white disabled:cursor-not-allowed disabled:opacity-40"
      />
    </label>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span
        className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40 ${
          checked ? "border-white bg-white" : "border-white/25 bg-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full transition ${
            checked ? "left-5 bg-black" : "left-0.5 bg-white/70"
          }`}
        />
      </button>
    </label>
  )
}

export function EditorControls({ settings, onChange, disabled }: EditorControlsProps) {
  const patch = (partial: Partial<AsciiEditorSettings>) => {
    onChange({ ...settings, ...partial })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Controls
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              saveDefaultSettings(settings)
              onChange({ ...settings })
            }}
            className="text-[11px] uppercase tracking-[0.14em] text-white/50 underline decoration-white/20 underline-offset-4 transition hover:text-white disabled:opacity-40"
            style={{ fontFamily: "var(--font-mono)" }}
            title="Remember these controls as the default on reload"
          >
            Save as default
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              clearSavedDefaultSettings()
              onChange({ ...DEFAULT_ASCII_SETTINGS })
            }}
            className="text-[11px] uppercase tracking-[0.14em] text-white/50 underline decoration-white/20 underline-offset-4 transition hover:text-white disabled:opacity-40"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <p
          className="text-[10px] uppercase tracking-[0.16em] text-white/35"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          ASCII
        </p>
        <SliderRow
          label="Detail"
          value={settings.cellSize}
          min={0.3}
          max={14}
          step={0.1}
          disabled={disabled}
          display={settings.cellSize.toFixed(1)}
          onChange={(cellSize) => patch({ cellSize })}
        />
        <SliderRow
          label="Contrast"
          value={settings.contrastAdjust}
          min={0.1}
          max={4}
          step={0.05}
          disabled={disabled}
          display={settings.contrastAdjust.toFixed(2)}
          onChange={(contrastAdjust) => patch({ contrastAdjust })}
        />
        <SliderRow
          label="Brightness"
          value={settings.brightnessAdjust}
          min={-1}
          max={1}
          step={0.01}
          disabled={disabled}
          display={settings.brightnessAdjust.toFixed(2)}
          onChange={(brightnessAdjust) => patch({ brightnessAdjust })}
        />
        <label className="block space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span
              className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Tint
            </span>
            <span
              className="text-[11px] text-white/70"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {settings.tintColor}
            </span>
          </div>
          <input
            type="color"
            value={settings.tintColor}
            disabled={disabled}
            onChange={(e) => patch({ tintColor: e.target.value })}
            className="h-9 w-full cursor-pointer rounded-md border border-white/15 bg-transparent disabled:cursor-not-allowed disabled:opacity-40"
          />
        </label>
        <label className="block space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span
              className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Background
            </span>
            <span
              className="text-[11px] text-white/70"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {settings.backgroundColor}
            </span>
          </div>
          <input
            type="color"
            value={settings.backgroundColor}
            disabled={disabled}
            onChange={(e) => patch({ backgroundColor: e.target.value })}
            className="h-9 w-full cursor-pointer rounded-md border border-white/15 bg-transparent disabled:cursor-not-allowed disabled:opacity-40"
          />
        </label>
        <ToggleRow
          label="Invert"
          checked={settings.invert}
          disabled={disabled}
          onChange={(invert) => patch({ invert })}
        />
        <ToggleRow
          label="Depth"
          checked={settings.volumeShading}
          disabled={disabled}
          onChange={(volumeShading) => patch({ volumeShading })}
        />
      </div>

      <div className="space-y-5 border-t border-[var(--line)] pt-5">
        <p
          className="text-[10px] uppercase tracking-[0.16em] text-white/35"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Model
        </p>
        <SliderRow
          label="Scale"
          value={settings.modelScale}
          min={0.1}
          max={18}
          step={0.1}
          disabled={disabled}
          display={settings.modelScale.toFixed(1)}
          onChange={(modelScale) => patch({ modelScale })}
        />
        <SliderRow
          label="Height"
          value={settings.modelY}
          min={-8}
          max={6}
          step={0.05}
          disabled={disabled}
          display={settings.modelY.toFixed(2)}
          onChange={(modelY) => patch({ modelY })}
        />
        <SliderRow
          label="Zoom"
          value={settings.cameraZ}
          min={1}
          max={24}
          step={0.1}
          disabled={disabled}
          display={settings.cameraZ.toFixed(1)}
          onChange={(cameraZ) => patch({ cameraZ })}
        />
      </div>

      <div className="space-y-5 border-t border-[var(--line)] pt-5">
        <p
          className="text-[10px] uppercase tracking-[0.16em] text-white/35"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Light
        </p>
        <SliderRow
          label="Ambient"
          value={settings.ambientIntensity}
          min={0}
          max={2}
          step={0.01}
          disabled={disabled}
          display={settings.ambientIntensity.toFixed(2)}
          onChange={(ambientIntensity) => patch({ ambientIntensity })}
        />
        <SliderRow
          label="Key"
          value={settings.keyLightIntensity}
          min={0}
          max={18}
          step={0.1}
          disabled={disabled}
          display={settings.keyLightIntensity.toFixed(1)}
          onChange={(keyLightIntensity) => patch({ keyLightIntensity })}
        />
        <SliderRow
          label="Fill"
          value={settings.fillLightIntensity}
          min={0}
          max={12}
          step={0.1}
          disabled={disabled}
          display={settings.fillLightIntensity.toFixed(1)}
          onChange={(fillLightIntensity) => patch({ fillLightIntensity })}
        />
      </div>
    </div>
  )
}
