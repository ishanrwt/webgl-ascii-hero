"use client";

import Image from "next/image";
import { EffectScene } from "./effect-scene";

export function Hero() {
  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* One-page Hero Section */}
      <section className="relative isolate min-h-screen overflow-hidden">
        {/* Right -- 3D Canvas section (background) */}
        <div className="absolute inset-0">
          <EffectScene className="h-full w-full" enableZoom={true} />
        </div>
        <div className="absolute inset-0 bg-black/35" />

        {/* Left -- Content section (foreground) */}
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6 py-12">
          <div className="max-w-2xl -translate-y-[20%] text-center">
            <Image
              src="/vortayl-logo-w.svg"
              alt="Vortayl logo"
              width={180}
              height={36}
              priority
              className="mx-auto mb-6"
            />

            <h3 className="font-mono text-lg font-medium leading-relaxed text-white/70">
              Development in progress...
            </h3>
          </div>
        </div>
      </section>
    </div>
  );
}

