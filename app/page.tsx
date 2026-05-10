"use client";

import { motion } from "framer-motion";
import DownloaderForm from "@/components/DownloaderForm";

export default function HomePage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden">

      <div className="cyber-grid" />
      <div className="scanlines" />

      {/* Cyan orb */}
      <motion.div className="fixed z-[2] rounded-full pointer-events-none"
        style={{ width:700, height:700, top:"-200px", left:"-200px",
          background:"radial-gradient(circle at center, rgba(6,182,212,0.18) 0%, rgba(6,182,212,0.06) 45%, transparent 70%)",
          filter:"blur(40px)" }}
        animate={{ x:[0,60,20,-40,0], y:[0,40,80,20,0], scale:[1,1.08,0.95,1.04,1] }}
        transition={{ duration:22, repeat:Infinity, ease:"easeInOut" }} />

      {/* Purple orb */}
      <motion.div className="fixed z-[2] rounded-full pointer-events-none"
        style={{ width:600, height:600, bottom:"-150px", right:"-150px",
          background:"radial-gradient(circle at center, rgba(168,85,247,0.16) 0%, rgba(168,85,247,0.05) 45%, transparent 70%)",
          filter:"blur(50px)" }}
        animate={{ x:[0,-50,-20,40,0], y:[0,-30,-70,-10,0], scale:[1,0.92,1.1,0.98,1] }}
        transition={{ duration:26, repeat:Infinity, ease:"easeInOut", delay:4 }} />

      {/* Top / bottom accent lines */}
      <div className="fixed top-0 left-0 right-0 z-[5] h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
      <div className="fixed bottom-0 left-0 right-0 z-[5] h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

      {/* Side labels */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-[5] hidden lg:flex flex-col items-center gap-3">
        <div className="w-px h-24 bg-gradient-to-b from-transparent to-cyan-500/40" />
        <span className="font-mono text-[8px] text-cyan-500/40 tracking-[0.4em] [writing-mode:vertical-rl] rotate-180">NEXLOAD::SYSTEM</span>
        <div className="w-px h-24 bg-gradient-to-t from-transparent to-cyan-500/40" />
      </div>
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[5] hidden lg:flex flex-col items-center gap-3">
        <div className="w-px h-24 bg-gradient-to-b from-transparent to-purple-500/40" />
        <span className="font-mono text-[8px] text-purple-500/40 tracking-[0.4em] [writing-mode:vertical-rl]">v2.0::ACTIVE</span>
        <div className="w-px h-24 bg-gradient-to-t from-transparent to-purple-500/40" />
      </div>

      {/* Corner HUDs */}
      {(["tl","tr","bl","br"] as const).map((pos) => (
        <CornerHUD key={pos} position={pos} />
      ))}

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen items-start justify-center pt-8 pb-16">
        <DownloaderForm />
      </div>
    </main>
  );
}

function CornerHUD({ position }: { position:"tl"|"tr"|"bl"|"br" }) {
  const posClass = { tl:"top-4 left-4", tr:"top-4 right-4", bl:"bottom-4 left-4", br:"bottom-4 right-4" }[position];
  const rotate   = { tl:"0", tr:"90deg", bl:"-90deg", br:"180deg" }[position];
  return (
    <div className={`fixed ${posClass} z-[5] pointer-events-none`} style={{ transform:`rotate(${rotate})` }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M0 12 L0 0 L12 0" stroke="rgba(6,182,212,0.3)" strokeWidth="1" />
        <circle cx="0" cy="0" r="2" fill="rgba(6,182,212,0.5)" />
      </svg>
    </div>
  );
}
