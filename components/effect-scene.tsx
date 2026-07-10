"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import type { ComponentPropsWithoutRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { EffectComposer } from "@react-three/postprocessing"
import { Environment, OrbitControls, useGLTF } from "@react-three/drei"
import { Group, Mesh, MeshStandardMaterial, Vector2 } from "three"
import { AsciiEffect } from "./ascii-effect"
import {
  DEFAULT_ASCII_SETTINGS,
  type AsciiEditorSettings,
} from "../lib/ascii-settings"

function UserModel({
  modelUrl,
  ...props
}: ComponentPropsWithoutRef<"group"> & { modelUrl: string }) {
  const { scene } = useGLTF(modelUrl)

  const basicMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.12,
        metalness: 0,
        flatShading: false,
      }),
    []
  )

  useEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as Mesh
      if ((mesh as any).isMesh) {
        const originalMat = (mesh as any).material
        if (originalMat && originalMat.dispose && originalMat !== basicMat) {
          try {
            originalMat.dispose()
          } catch {
            // ignore
          }
        }
        ;(mesh as any).material = basicMat
      }
    })

    return () => {
      try {
        if (basicMat && typeof basicMat.dispose === "function") {
          basicMat.dispose()
        }
      } catch {
        // ignore
      }
    }
  }, [scene, basicMat])

  return <primitive object={scene} {...props} />
}

export const AUTO_ROTATE_SPEED = 0.4
/** One full Y revolution at base auto-rotate speed — use for seamless looping video. */
export const LOOP_ROTATION_MS = Math.round((Math.PI * 2) / AUTO_ROTATE_SPEED * 1000)

const HOVER_SPIN_MULTIPLIER = 2
const TILT_FORWARD = 0.3
const TILT_LEFT = -0.08

function DraggableUserModel({
  isHovered = false,
  modelUrl,
  modelScale,
  modelY,
  lockBaseSpin = false,
  paused = false,
}: {
  isHovered?: boolean
  modelUrl: string
  modelScale: number
  modelY: number
  lockBaseSpin?: boolean
  paused?: boolean
}) {
  const groupRef = useRef<Group>(null)
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const autoY = useRef(0)

  const spinSpeed =
    lockBaseSpin || !isHovered
      ? AUTO_ROTATE_SPEED
      : AUTO_ROTATE_SPEED * HOVER_SPIN_MULTIPLIER

  useFrame((_, delta) => {
    if (!groupRef.current) return
    if (!isDragging.current && !paused) {
      autoY.current += delta * spinSpeed
    }
    groupRef.current.rotation.x = rotation.x + TILT_FORWARD
    groupRef.current.rotation.y = rotation.y + autoY.current
    groupRef.current.rotation.z = TILT_LEFT
    groupRef.current.position.y = modelY
  })

  useEffect(() => {
    const container = document.querySelector("[data-model-canvas-container]")
    if (!container) return

    const onPointerDown = (e: Event) => {
      if (lockBaseSpin) return
      const pe = e as PointerEvent
      if ((pe.target as HTMLElement).closest("canvas")) {
        isDragging.current = true
        lastPointer.current = { x: pe.clientX, y: pe.clientY }
      }
    }

    const onPointerMove = (e: Event) => {
      if (!isDragging.current || lockBaseSpin) return
      const pe = e as PointerEvent
      const dx = (pe.clientX - lastPointer.current.x) * 0.005
      const dy = (pe.clientY - lastPointer.current.y) * 0.005
      lastPointer.current = { x: pe.clientX, y: pe.clientY }
      setRotation((r) => ({ x: r.x - dy, y: r.y + dx }))
    }

    const onPointerUp = () => {
      isDragging.current = false
    }

    container.addEventListener("pointerdown", onPointerDown as EventListener)
    window.addEventListener("pointermove", onPointerMove as EventListener)
    window.addEventListener("pointerup", onPointerUp)
    return () => {
      container.removeEventListener("pointerdown", onPointerDown as EventListener)
      window.removeEventListener("pointermove", onPointerMove as EventListener)
      window.removeEventListener("pointerup", onPointerUp)
    }
  }, [lockBaseSpin])

  return (
    <group ref={groupRef} position={[0, modelY, 0]}>
      <UserModel modelUrl={modelUrl} scale={modelScale} />
    </group>
  )
}

function CameraHoverZoom({
  isHovered = false,
  cameraZ,
  lockBaseZoom = false,
}: {
  isHovered?: boolean
  cameraZ: number
  lockBaseZoom?: boolean
}) {
  const { camera } = useThree()
  useFrame(() => {
    const zoomedZ = cameraZ / 1.1
    const targetZ = !lockBaseZoom && isHovered ? zoomedZ : cameraZ
    camera.position.z += (targetZ - camera.position.z) * 0.08
    camera.position.x += (0 - camera.position.x) * 0.08
    camera.position.y += (0 - camera.position.y) * 0.08
  })
  return null
}

function SceneWithDelayedComposer({
  resolution,
  mousePos,
  enableZoom = true,
  isHovered = false,
  modelUrl,
  settings,
  lockForLoop = false,
  paused = false,
}: {
  resolution: Vector2
  mousePos: Vector2
  enableZoom?: boolean
  isHovered?: boolean
  modelUrl?: string
  settings: AsciiEditorSettings
  lockForLoop?: boolean
  paused?: boolean
}) {
  const { gl } = useThree()
  const [composerReady, setComposerReady] = useState(false)
  const frameCount = useRef(0)

  useFrame(() => {
    frameCount.current++
    if (frameCount.current >= 3 && !composerReady) {
      setTimeout(() => {
        try {
          const context = gl.getContext()
          if (context && !(context as WebGLRenderingContext).isContextLost?.()) {
            setComposerReady(true)
          }
        } catch {
          // ignore
        }
      }, 100)
    }
  })

  const postfx = useMemo(
    () => ({
      contrastAdjust: settings.contrastAdjust,
      brightnessAdjust: settings.brightnessAdjust,
    }),
    [settings.contrastAdjust, settings.brightnessAdjust]
  )

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <Environment preset="studio" background={false} />
      <ambientLight intensity={settings.ambientIntensity} />
      <directionalLight position={[3, 4, 5]} intensity={settings.keyLightIntensity} />
      <directionalLight position={[-4, 1.5, 2]} intensity={settings.fillLightIntensity} />
      <directionalLight position={[0, -1, 4]} intensity={0.6} />
      <CameraHoverZoom
        isHovered={isHovered}
        cameraZ={settings.cameraZ}
        lockBaseZoom={lockForLoop || paused}
      />
      {modelUrl ? (
        <Suspense fallback={null}>
          <DraggableUserModel
            key={modelUrl}
            isHovered={isHovered}
            modelUrl={modelUrl}
            modelScale={settings.modelScale}
            modelY={settings.modelY}
            lockBaseSpin={lockForLoop}
            paused={paused}
          />
        </Suspense>
      ) : null}
      <OrbitControls enableRotate={false} enableZoom={enableZoom} enablePan={false} />
      {composerReady && (
        <EffectComposer>
          <AsciiEffect
            style="standard"
            cellSize={settings.cellSize}
            invert={settings.invert}
            color={true}
            characterSet="terminal"
            volumeShading={settings.volumeShading}
            tintColor={settings.tintColor}
            backgroundColor={settings.backgroundColor}
            resolution={resolution}
            mousePos={mousePos}
            postfx={postfx}
          />
        </EffectComposer>
      )}
    </>
  )
}

interface EffectSceneProps {
  className?: string
  enableZoom?: boolean
  modelUrl?: string
  settings?: AsciiEditorSettings
  /** Lock base spin/zoom so recorded video loops cleanly */
  lockForLoop?: boolean
  /** Freeze auto-rotation for still PNG capture */
  paused?: boolean
}

export function EffectScene({
  className,
  enableZoom = true,
  modelUrl,
  settings = DEFAULT_ASCII_SETTINGS,
  lockForLoop = false,
  paused = false,
}: EffectSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [mousePos] = useState(() => new Vector2(0, 0))
  const [resolution] = useState(() => new Vector2(1920, 1080))

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateResolution = () => {
      const rect = container.getBoundingClientRect()
      resolution.set(rect.width || 1920, rect.height || 1080)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = rect.height - (e.clientY - rect.top)
      mousePos.set(x, y)
    }

    updateResolution()
    const ro = new ResizeObserver(updateResolution)
    ro.observe(container)
    container.addEventListener("mousemove", handleMouseMove)

    return () => {
      ro.disconnect()
      container.removeEventListener("mousemove", handleMouseMove)
    }
  }, [mousePos, resolution])

  return (
    <div
      ref={containerRef}
      data-model-canvas-container
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: "100%",
        height: className ? "100%" : "100vh",
        minHeight: className ? 300 : undefined,
      }}
    >
      <Canvas
        dpr={Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 1.5)}
        camera={{ position: [0, 0, settings.cameraZ], fov: 50 }}
        gl={{ preserveDrawingBuffer: true }}
        style={{ background: settings.backgroundColor }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 0.6

          const handleContextLost = (event: Event) => {
            event.preventDefault()
            console.warn("WebGL context lost. Attempting to restore...")
          }

          const handleContextRestored = () => {
            console.log("WebGL context restored")
          }

          gl.domElement.addEventListener("webglcontextlost", handleContextLost)
          gl.domElement.addEventListener("webglcontextrestored", handleContextRestored)

          return () => {
            gl.domElement.removeEventListener("webglcontextlost", handleContextLost)
            gl.domElement.removeEventListener("webglcontextrestored", handleContextRestored)
          }
        }}
      >
        <SceneWithDelayedComposer
          resolution={resolution}
          mousePos={mousePos}
          enableZoom={enableZoom}
          isHovered={isHovered}
          modelUrl={modelUrl}
          settings={settings}
          lockForLoop={lockForLoop}
          paused={paused}
        />
      </Canvas>
    </div>
  )
}
