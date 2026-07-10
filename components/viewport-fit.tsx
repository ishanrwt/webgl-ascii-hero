"use client"

import { useEffect } from "react"

const DESKTOP_WIDTH = 980

function applyViewportFit() {
  const scale = Math.min(1, window.innerWidth / DESKTOP_WIDTH)
  const content = [
    `width=${DESKTOP_WIDTH}`,
    `initial-scale=${scale}`,
    `minimum-scale=${scale}`,
    `maximum-scale=${scale}`,
    "user-scalable=no",
  ].join(", ")

  let meta = document.querySelector('meta[name="viewport"]')
  if (!meta) {
    meta = document.createElement("meta")
    meta.setAttribute("name", "viewport")
    document.head.appendChild(meta)
  }
  meta.setAttribute("content", content)
}

/** Fits the 980px desktop viewport to the device width and locks zoom. */
export function ViewportFit() {
  useEffect(() => {
    applyViewportFit()
    window.addEventListener("resize", applyViewportFit)
    window.addEventListener("orientationchange", applyViewportFit)
    return () => {
      window.removeEventListener("resize", applyViewportFit)
      window.removeEventListener("orientationchange", applyViewportFit)
    }
  }, [])

  return null
}
