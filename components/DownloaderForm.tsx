"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PLATFORMS = [
  { id: "youtube",   icon: "▶", accent: "#FF0000", tag: "YOUTUBE" },
  { id: "instagram", icon: "◈", accent: "#E1306C", tag: "INSTAGRAM" },
  { id: "twitter",   icon: "✕", accent: "#1DA1F2", tag: "X / TWITTER" },
  { id: "tiktok",    icon: "◎", accent: "#69C9D0", tag: "TIKTOK" },
  { id: "facebook",  icon: "◉", accent: "#1877F2", tag: "FACEBOOK" },
  { id: "vimeo",     icon: "◈", accent: "#1AB7EA", tag: "VIMEO" },
];

type Status = "idle" | "fetching" | "ready" | "complete" | "error";

interface MediaOption {
  url: string; quality: string; extension: string;
  type: "video" | "audio"; size: number; width: number; height: number;
}
interface Stats {
  likes: string; comments: string; views: string; shares: string; saves: string;
}
interface DownloadInfo {
  title: string; thumbnail: string; duration: string; platform: string;
  author: string; downloadUrl: string; quality: string; extension: string;
  mediaOptions: MediaOption[]; stats: Stats | null;
}

function detectPlatform(url: string): string | null {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("facebook.com") || url.includes("fb.com")) return "facebook";
  if (url.includes("vimeo.com")) return "vimeo";
  return null;
}

function qualityLabel(quality: string): string {
  const map: Record<string, string> = {
    hd_no_watermark: "HD • NO WATERMARK",
    no_watermark: "NO WATERMARK",
    watermark: "WITH WATERMARK",
    audio: "AUDIO ONLY",
  };
  return map[quality] ?? quality.replace(/_/g, " ").toUpperCase();
}

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + " MB";
  return (bytes / 1_000).toFixed(0) + " KB";
}

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent : ""
  );
}

function StatusDot({ status }: { status: Status }) {
  const map: Record<Status, { color: string; label: string; blink: boolean }> = {
    idle:     { color: "bg-slate-600", label: "STANDBY",  blink: false },
    fetching: { color: "bg-cyan-400",  label: "SCANNING", blink: true  },
    ready:    { color: "bg-green-400", label: "READY",    blink: false },
    complete: { color: "bg-green-400", label: "COMPLETE", blink: false },
    error:    { color: "bg-red-500",   label: "ERROR",    blink: false },
  };
  const s = map[status];
  return (
    <div className="flex items-center gap-3">
      <span className={`w-3 h-3 rounded-full ${s.color} ${s.blink ? "status-blink" : ""}`} />
      <span className="font-mono text-sm font-bold text-slate-400 tracking-[0.3em]">{s.label}</span>
    </div>
  );
}

export default function DownloaderForm() {
  const [url,            setUrl]           = useState("");
  const [status,         setStatus]        = useState<Status>("idle");
  const [activePlatform, setActivePlatform]= useState<string | null>(null);
  const [downloadInfo,   setDownloadInfo]  = useState<DownloadInfo | null>(null);
  const [selectedMedia,  setSelectedMedia] = useState<MediaOption | null>(null);
  const [error,          setError]         = useState("");
  const [mobileHint,     setMobileHint]    = useState(false);

  const containerVariants = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
  };
  const cardVariants = {
    hidden:  { opacity: 0, scale: 0.8, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0,
      transition: { type: "spring", stiffness: 200, damping: 18 } },
  };

  const handleUrlChange = (val: string) => {
    setUrl(val);
    setActivePlatform(detectPlatform(val));
    setError("");
    setDownloadInfo(null);
    setSelectedMedia(null);
    setMobileHint(false);
    if (status !== "idle") setStatus("idle");
  };

  const handleAnalyze = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus("fetching");
    setError("");
    setDownloadInfo(null);
    setSelectedMedia(null);
    setMobileHint(false);
    try {
      const res  = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`);
      if (!data.downloadUrl) throw new Error("No download URL in response.");
      setDownloadInfo(data);
      const best = data.mediaOptions?.find((m: MediaOption) => m.quality === "hd_no_watermark")
        ?? data.mediaOptions?.[0] ?? null;
      setSelectedMedia(best);
      if (data.platform) setActivePlatform(data.platform);
      setStatus("ready");
    } catch (err: unknown) {
      setError(`ERR :: ${err instanceof Error ? err.message : "Unknown error"}`);
      setStatus("error");
    }
  };

  const handleDownload = () => {
    const target = selectedMedia ?? (downloadInfo
      ? { url: downloadInfo.downloadUrl, extension: downloadInfo.extension,
          quality: downloadInfo.quality, type: "video" as const, size: 0, width: 0, height: 0 }
      : null);
    if (!target || status !== "ready") return;

    const mobile   = isMobile();
    const title    = downloadInfo?.title ?? "nexload";
    const safeName = title.replace(/[^a-z0-9\s]/gi, "").replace(/\s+/g, "_").substring(0, 60);
    const filename = `${safeName}.${target.extension}`;

    if (mobile) {
      window.open(target.url, "_blank", "noopener,noreferrer");
      setMobileHint(true);
    } else {
      const a = document.createElement("a");
      a.href = target.url; a.download = filename;
      a.target = "_blank"; a.rel = "noopener noreferrer";
      a.style.display = "none";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    setStatus("complete");
  };

  const canDownload = status === "ready";

  return (
    <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-10">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity:0, y:-40 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.8, ease:[0.16,1,0.3,1] }} className="text-center space-y-3">
        <h1 className="logo-glitch font-display font-black text-6xl sm:text-8xl md:text-9xl tracking-tighter text-white text-glow-cyan uppercase"
          data-text="NEXLOAD">NEXLOAD</h1>
        <p className="font-mono text-sm sm:text-lg font-bold text-cyan-400 tracking-[0.3em] sm:tracking-[0.4em] uppercase">
          ⬡ Cybernetic Video Downloader ⬡
        </p>
        <div className="flex items-center justify-center gap-3 pt-1">
          <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-cyan-500" />
          <span className="font-mono text-[10px] text-slate-600 tracking-widest">ALL PLATFORMS SUPPORTED</span>
          <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-cyan-500" />
        </div>
      </motion.div>

      {/* ── PLATFORM GRID ───────────────────────────────────────────────── */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible"
        className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        {PLATFORMS.map((p) => (
          <motion.div key={p.id} variants={cardVariants}
            onClick={() => setActivePlatform(activePlatform === p.id ? null : p.id)}
            className={`platform-card bracket-border glass cursor-pointer border-2 rounded-sm p-3 sm:p-4 text-center select-none transition-all duration-200
              ${activePlatform === p.id ? "border-cyan-500 border-glow-cyan" : "border-slate-700 hover:border-cyan-500/60"}`}>
            <div className="text-xl sm:text-2xl mb-1 sm:mb-2" style={{ color: activePlatform === p.id ? p.accent : "#64748b" }}>{p.icon}</div>
            <div className="font-mono text-[9px] sm:text-[10px] font-bold tracking-wider sm:tracking-widest leading-tight"
              style={{ color: activePlatform === p.id ? p.accent : "#475569" }}>{p.tag}</div>
            <AnimatePresence>
              {activePlatform === p.id && (
                <motion.div initial={{ scaleX:0 }} animate={{ scaleX:1 }} exit={{ scaleX:0 }}
                  className="mt-1.5 h-0.5 bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>

      {/* ── URL INPUT — BIG & MOBILE FRIENDLY ───────────────────────────── */}
      <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.4, duration:0.7 }}
        className="glass bracket-border border-2 border-cyan-500/40 rounded-sm p-5 sm:p-8 space-y-5">

        {/* Big label */}
        <div className="text-center sm:text-left">
          <p className="font-mono text-lg sm:text-sm font-black text-cyan-400 tracking-[0.2em] sm:tracking-[0.3em] uppercase">
            ◈ PASTE YOUR VIDEO LINK
          </p>
          <p className="font-mono text-xs text-slate-600 mt-1 tracking-wider">
            YouTube • TikTok • Instagram • Facebook • Twitter • Vimeo
          </p>
        </div>

        {/* Input — full width on mobile, side by side on desktop */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && status !== "fetching" && handleAnalyze()}
            placeholder="https://www.tiktok.com/@user/video/..."
            className="cyber-input font-mono text-base sm:text-base font-bold w-full glass border-2 border-cyan-500/30 rounded-sm px-5 py-5 sm:py-4 text-white placeholder:text-slate-600 bg-transparent transition-all duration-300 focus:border-cyan-400"
          />
          <motion.button
            onClick={handleAnalyze}
            disabled={status === "fetching" || !url.trim()}
            whileTap={{ scale:0.96 }}
            className={`font-mono text-base sm:text-sm font-black tracking-[0.2em] px-8 py-5 sm:py-4 rounded-sm border-2 transition-all duration-200 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed uppercase w-full sm:w-auto
              ${status === "fetching"
                ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                : "bg-cyan-500/10 border-cyan-500/60 text-cyan-400 hover:bg-cyan-500/30 hover:border-cyan-400 hover:text-white"}`}>
            {status === "fetching" ? "SCANNING..." : "ANALYZE"}
          </motion.button>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
          <StatusDot status={status} />
          <span className="font-mono text-xs sm:text-sm font-bold text-slate-500 tracking-[0.15em] sm:tracking-[0.2em]">
            {activePlatform ? `◈ ${activePlatform.toUpperCase()} DETECTED` : "◈ AWAITING URL"}
          </span>
        </div>
      </motion.div>

      {/* ── ERROR ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
            exit={{ opacity:0, height:0 }}
            className="font-mono text-sm font-bold text-red-400 border-2 border-red-500/40 bg-red-500/5 rounded-sm px-5 py-4 tracking-wide">
            ⚠ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RESULT CARD ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {downloadInfo && (
          <motion.div initial={{ opacity:0, y:20, scale:0.98 }} animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:-10 }} transition={{ type:"spring", stiffness:180, damping:20 }}
            className="glass bracket-border border-2 border-cyan-500/30 rounded-sm overflow-hidden">

            {/* Thumbnail + meta */}
            <div className="sm:flex">
              <div className="sm:w-72 flex-shrink-0 relative bg-slate-900">
                {downloadInfo.thumbnail
                  ? <img src={downloadInfo.thumbnail} alt="thumb" className="w-full h-52 sm:h-full object-cover opacity-90" />
                  : <div className="w-full h-52 flex items-center justify-center text-slate-700 font-mono font-bold text-sm">NO PREVIEW</div>}
                <div className="absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-transparent to-[#050505]/80" />
                <div className="absolute bottom-3 right-3 font-mono text-sm font-black bg-black/90 border-2 border-cyan-500/50 px-3 py-1 text-cyan-400 tracking-widest">
                  {downloadInfo.duration}
                </div>
              </div>
              <div className="flex-1 p-5 sm:p-6 space-y-4">
                <div>
                  {downloadInfo.author && <p className="font-mono text-sm font-bold text-cyan-500/80 tracking-widest mb-2">@{downloadInfo.author}</p>}
                  <p className="font-display font-black text-white text-base sm:text-lg leading-snug line-clamp-3">{downloadInfo.title}</p>
                </div>
                {downloadInfo.stats && (
                  <div className="grid grid-cols-5 gap-1 sm:gap-2">
                    {([
                      { icon:"♥", label:"LIKES",    val:downloadInfo.stats.likes    },
                      { icon:"▶", label:"VIEWS",    val:downloadInfo.stats.views    },
                      { icon:"✦", label:"CMTS",     val:downloadInfo.stats.comments },
                      { icon:"⇪", label:"SHARES",   val:downloadInfo.stats.shares   },
                      { icon:"◈", label:"SAVES",    val:downloadInfo.stats.saves    },
                    ]).map(({ icon, label, val }) => (
                      <div key={label} className="border-2 border-cyan-500/15 rounded-sm p-1.5 sm:p-2 text-center bg-black/20">
                        <div className="text-cyan-500/70 text-xs sm:text-sm mb-0.5">{icon}</div>
                        <div className="font-mono text-xs sm:text-sm font-black text-white">{val}</div>
                        <div className="font-mono text-[7px] font-bold text-slate-600 tracking-wider mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                )}
                <span className="inline-block font-mono text-xs font-black border-2 border-cyan-500/30 px-3 py-1 text-cyan-400 tracking-[0.3em] rounded-sm">
                  {downloadInfo.platform.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Quality selector */}
            {downloadInfo.mediaOptions?.length > 0 && (
              <div className="px-5 sm:px-6 pb-4 pt-5 space-y-3 border-t-2 border-cyan-500/10">
                <p className="font-mono text-sm font-black text-cyan-400 tracking-[0.3em] uppercase">◈ SELECT QUALITY</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  {downloadInfo.mediaOptions.map((m, i) => (
                    <button key={i} onClick={() => setSelectedMedia(m)}
                      className={`text-left border-2 rounded-sm px-4 py-3 sm:py-3 transition-all duration-150
                        ${selectedMedia?.url === m.url
                          ? "bg-cyan-500/20 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                          : "border-slate-700 hover:border-cyan-500/50 bg-transparent"}`}>
                      <div className="font-mono text-sm font-black text-white">{qualityLabel(m.quality)}</div>
                      <div className="font-mono text-xs font-bold text-slate-500 mt-1 flex gap-2">
                        <span>{m.extension.toUpperCase()}</span>
                        {m.width > 0 && <span>{m.width}×{m.height}</span>}
                        {m.size > 0 && <span>{formatBytes(m.size)}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile hint */}
            <AnimatePresence>
              {mobileHint && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  className="mx-5 sm:mx-6 mb-4 font-mono text-sm font-bold text-cyan-400 border-2 border-cyan-500/30 bg-cyan-500/5 rounded-sm px-5 py-3 tracking-wide">
                  📱 Video opened in new tab — <strong>Long press → Save Video</strong>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Complete banner */}
            <AnimatePresence>
              {status === "complete" && !mobileHint && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                  className="mx-5 sm:mx-6 mb-4 font-mono text-sm font-black text-green-400 border-2 border-green-500/40 bg-green-500/5 rounded-sm px-5 py-3 tracking-wide">
                  ✓ DOWNLOAD INITIATED — If it didn&apos;t save, right-click → <strong>Save Video As</strong>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Download button — big on mobile */}
            <div className="px-5 sm:px-6 pb-6 pt-2">
              <motion.button onClick={handleDownload} disabled={!canDownload} whileTap={{ scale:0.98 }}
                className={`w-full font-display font-black tracking-[0.2em] sm:tracking-[0.25em] text-lg sm:text-lg py-6 sm:py-5 rounded-sm border-2 transition-all duration-300 uppercase
                  ${canDownload
                    ? "bg-cyan-500/15 border-cyan-500 text-cyan-300 hover:bg-cyan-500/30 hover:text-white pulse-loading"
                    : status === "complete"
                    ? "bg-green-500/10 border-green-500/40 text-green-400 cursor-not-allowed"
                    : "opacity-0 pointer-events-none"}`}>
                {status === "complete"
                  ? "✓ DOWNLOAD INITIATED"
                  : selectedMedia
                  ? `⬇ DOWNLOAD ${qualityLabel(selectedMedia.quality)}${selectedMedia.size ? " · " + formatBytes(selectedMedia.size) : ""}`
                  : "⬇ INITIATE DOWNLOAD"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.2 }}
        className="text-center font-mono text-[10px] font-bold text-slate-700 tracking-[0.3em] uppercase pb-4">
        NEXLOAD // CYBERNETIC MEDIA ACQUISITION // USE RESPONSIBLY
      </motion.p>
    </div>
  );
}
