"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PLATFORMS = [
  { id: "youtube",   icon: "▶", accent: "#FF0000", tag: "YT" },
  { id: "instagram", icon: "◈", accent: "#E1306C", tag: "IG" },
  { id: "twitter",   icon: "✕", accent: "#1DA1F2", tag: "TW" },
  { id: "tiktok",    icon: "◎", accent: "#69C9D0", tag: "TK" },
  { id: "facebook",  icon: "◉", accent: "#1877F2", tag: "FB" },
  { id: "vimeo",     icon: "◈", accent: "#1AB7EA", tag: "VM" },
];

type Status = "idle" | "fetching" | "ready" | "downloading" | "complete" | "error";

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
    hd_no_watermark: "HD • No Watermark",
    no_watermark: "No Watermark",
    watermark: "With Watermark",
    audio: "Audio Only",
  };
  return map[quality] ?? quality.replace(/_/g, " ").toUpperCase();
}

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + " MB";
  return (bytes / 1_000).toFixed(0) + " KB";
}

function StatusDot({ status }: { status: Status }) {
  const map: Record<Status, { color: string; label: string; blink: boolean }> = {
    idle:        { color: "bg-slate-600", label: "STANDBY",     blink: false },
    fetching:    { color: "bg-cyan-400",  label: "SCANNING",    blink: true  },
    ready:       { color: "bg-green-400", label: "READY",       blink: false },
    downloading: { color: "bg-cyan-400",  label: "DOWNLOADING", blink: true  },
    complete:    { color: "bg-green-400", label: "COMPLETE",    blink: false },
    error:       { color: "bg-red-500",   label: "ERROR",       blink: false },
  };
  const s = map[status];
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${s.color} ${s.blink ? "status-blink" : ""}`} />
      <span className="font-mono text-xs text-slate-500 tracking-widest">{s.label}</span>
    </div>
  );
}

export default function DownloaderForm() {
  const [url,            setUrl]           = useState("");
  const [status,         setStatus]        = useState<Status>("idle");
  const [progress,       setProgress]      = useState(0);
  const [activePlatform, setActivePlatform]= useState<string | null>(null);
  const [downloadInfo,   setDownloadInfo]  = useState<DownloadInfo | null>(null);
  const [selectedMedia,  setSelectedMedia] = useState<MediaOption | null>(null);
  const [error,          setError]         = useState("");

  const containerVariants = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
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
    if (status !== "idle") setStatus("idle");
  };

  const handleAnalyze = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus("fetching");
    setError("");
    setDownloadInfo(null);
    setSelectedMedia(null);
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

  const handleDownload = async () => {
    const target = selectedMedia ?? (downloadInfo
      ? { url: downloadInfo.downloadUrl, extension: downloadInfo.extension,
          quality: downloadInfo.quality, type: "video" as const, size: 0, width: 0, height: 0 }
      : null);
    if (!target || status !== "ready") return;
    setStatus("downloading");
    setProgress(0);
    try {
      const response = await fetch(target.url);
      if (!response.ok) throw new Error(`Fetch failed (${response.status})`);
      const contentLength = response.headers.get("Content-Length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;
      const chunks: Blob[] = [];
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(new Blob([value]));
            loaded += value.length;
            if (total > 0) setProgress(Math.min(Math.round((loaded / total) * 100), 99));
            else setProgress((p) => Math.min(p + 2, 90));
          }
        }
      } else {
        const blob = await response.blob();
        chunks.push(blob);
      }
      setProgress(100);
      const blob = new Blob(chunks);
      const blobUrl = URL.createObjectURL(blob);
      const title   = downloadInfo?.title ?? "nexload";
      const fname   = `${title.replace(/[^a-z0-9\s]/gi,"").replace(/\s+/g,"_").substring(0,60)}.${target.extension}`;
      const a = document.createElement("a");
      a.href = blobUrl; a.download = fname; a.style.display = "none";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
      setStatus("complete");
    } catch (err: unknown) {
      setError(`DOWNLOAD ERR :: ${err instanceof Error ? err.message : "Failed"}`);
      setStatus("error");
    }
  };

  const isLoading   = status === "fetching" || status === "downloading";
  const canDownload = status === "ready";

  return (
    <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-12 space-y-8">

      {/* Header */}
      <motion.div initial={{ opacity:0, y:-30 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.7, ease:[0.16,1,0.3,1] }} className="text-center space-y-3">
        <div className="inline-flex items-center gap-3 mb-2">
          <span className="w-8 h-px bg-cyan-500/50" />
          <span className="font-mono text-xs text-cyan-500/70 tracking-[0.3em]">SYS::NEXLOAD_v2.0</span>
          <span className="w-8 h-px bg-cyan-500/50" />
        </div>
        <h1 className="logo-glitch font-display font-bold text-5xl sm:text-6xl tracking-tight text-white text-glow-cyan"
          data-text="NEXLOAD">NEXLOAD</h1>
        <p className="font-mono text-xs text-slate-500 tracking-widest uppercase">
          Cybernetic Video Acquisition System // All Platforms
        </p>
      </motion.div>

      {/* Platform grid */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible"
        className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {PLATFORMS.map((p) => (
          <motion.div key={p.id} variants={cardVariants}
            onClick={() => setActivePlatform(activePlatform === p.id ? null : p.id)}
            className={`platform-card bracket-border glass cursor-pointer border rounded-sm p-3 text-center select-none transition-colors duration-200
              ${activePlatform === p.id ? "border-cyan-500 border-glow-cyan" : "border-cyan-500/20 hover:border-cyan-500/60"}`}>
            <div className="text-xl mb-1 transition-all duration-200"
              style={{ color: activePlatform === p.id ? p.accent : "#475569" }}>{p.icon}</div>
            <div className="font-mono text-[9px] tracking-widest text-slate-500">{p.tag}</div>
            <AnimatePresence>
              {activePlatform === p.id && (
                <motion.div initial={{ scaleX:0 }} animate={{ scaleX:1 }} exit={{ scaleX:0 }}
                  className="mt-1 h-px bg-cyan-500" />
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>

      {/* URL Input */}
      <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.5, duration:0.6, ease:[0.16,1,0.3,1] }}
        className="glass bracket-border border border-cyan-500/20 rounded-sm p-6 space-y-4">
        <div className="space-y-2">
          <label className="font-mono text-[10px] text-cyan-500/70 tracking-widest uppercase">◈ Target URL</label>
          <div className="flex gap-2">
            <input type="url" value={url} onChange={(e) => handleUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleAnalyze()}
              placeholder="https://www.tiktok.com/@user/video/..."
              className="cyber-input font-mono text-sm w-full glass border border-cyan-500/25 rounded-sm px-4 py-3 text-cyan-100 placeholder:text-slate-700 bg-transparent transition-all duration-300" />
            <motion.button onClick={handleAnalyze} disabled={isLoading || !url.trim()} whileTap={{ scale:0.96 }}
              className={`font-mono text-xs tracking-widest px-5 py-3 rounded-sm border transition-all duration-200 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed
                ${isLoading ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400"
                  : "bg-cyan-500/10 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500"}`}>
              {status === "fetching" ? "SCANNING..." : "ANALYZE"}
            </motion.button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <StatusDot status={status} />
          <span className="font-mono text-[10px] text-slate-700 tracking-widest">
            {activePlatform ? `PLATFORM :: ${activePlatform.toUpperCase()}` : "PLATFORM :: UNDETECTED"}
          </span>
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
            exit={{ opacity:0, height:0 }}
            className="font-mono text-xs text-red-400 border border-red-500/30 bg-red-500/5 rounded-sm px-4 py-3 tracking-wide">
            ⚠ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result card */}
      <AnimatePresence>
        {downloadInfo && (
          <motion.div initial={{ opacity:0, y:20, scale:0.98 }} animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:-10 }} transition={{ type:"spring", stiffness:180, damping:20 }}
            className="glass bracket-border border border-cyan-500/25 rounded-sm overflow-hidden">

            {/* Thumbnail + info */}
            <div className="sm:flex">
              <div className="sm:w-64 flex-shrink-0 relative bg-slate-900">
                {downloadInfo.thumbnail
                  ? <img src={downloadInfo.thumbnail} alt="thumb" className="w-full h-44 sm:h-full object-cover opacity-80" />
                  : <div className="w-full h-44 flex items-center justify-center text-slate-700 font-mono text-xs">NO PREVIEW</div>
                }
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#050505]/70" />
                <div className="absolute bottom-2 right-2 font-mono text-[10px] bg-black/80 border border-cyan-500/30 px-2 py-0.5 text-cyan-400">
                  {downloadInfo.duration}
                </div>
              </div>
              <div className="flex-1 p-5 space-y-4">
                <div>
                  {downloadInfo.author && (
                    <p className="font-mono text-[9px] text-cyan-500/60 tracking-widest mb-1">@{downloadInfo.author}</p>
                  )}
                  <p className="font-display font-semibold text-white text-sm leading-snug line-clamp-2">
                    {downloadInfo.title}
                  </p>
                </div>
                {/* Stats */}
                {downloadInfo.stats && (
                  <div className="grid grid-cols-5 gap-1">
                    {([
                      { icon:"♥", label:"LIKES",    val:downloadInfo.stats.likes    },
                      { icon:"▶", label:"VIEWS",    val:downloadInfo.stats.views    },
                      { icon:"✦", label:"COMMENTS", val:downloadInfo.stats.comments },
                      { icon:"⇪", label:"SHARES",   val:downloadInfo.stats.shares   },
                      { icon:"◈", label:"SAVES",    val:downloadInfo.stats.saves    },
                    ]).map(({ icon, label, val }) => (
                      <div key={label} className="border border-cyan-500/10 rounded-sm p-1.5 text-center">
                        <div className="text-cyan-500/50 text-xs mb-0.5">{icon}</div>
                        <div className="font-mono text-[10px] text-white font-bold">{val}</div>
                        <div className="font-mono text-[7px] text-slate-700 tracking-wider">{label}</div>
                      </div>
                    ))}
                  </div>
                )}
                <span className="inline-block font-mono text-[9px] border border-cyan-500/20 px-2 py-0.5 text-cyan-500/60 rounded-sm">
                  {downloadInfo.platform.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Quality selector */}
            {downloadInfo.mediaOptions?.length > 0 && (
              <div className="px-5 pb-2 pt-4 space-y-2 border-t border-cyan-500/10">
                <p className="font-mono text-[10px] text-cyan-500/60 tracking-widest uppercase">◈ Select Quality</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {downloadInfo.mediaOptions.map((m, i) => (
                    <button key={i} onClick={() => setSelectedMedia(m)}
                      className={`text-left border rounded-sm px-3 py-2 transition-all duration-150
                        ${selectedMedia?.url === m.url
                          ? "bg-cyan-500/15 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                          : "border-slate-800 hover:border-cyan-500/40 bg-transparent"}`}>
                      <div className="font-mono text-xs text-white">{qualityLabel(m.quality)}</div>
                      <div className="font-mono text-[9px] text-slate-600 mt-0.5 flex gap-2">
                        <span>{m.extension.toUpperCase()}</span>
                        {m.width > 0 && <span>{m.width}×{m.height}</span>}
                        {m.size > 0 && <span>{formatBytes(m.size)}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Progress bar */}
            <AnimatePresence>
              {status === "downloading" && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  className="px-5 pb-4 pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-mono text-[9px] text-slate-600 tracking-widest">TRANSFER PROGRESS</span>
                    <span className="font-mono text-[9px] text-cyan-400">{progress}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-sm overflow-hidden">
                    <motion.div className="h-full progress-shimmer" initial={{ width:0 }}
                      animate={{ width:`${progress}%` }} transition={{ ease:"linear", duration:0.15 }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Complete */}
            <AnimatePresence>
              {status === "complete" && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                  className="mx-5 mb-4 font-mono text-xs text-green-400 border border-green-500/30 bg-green-500/5 rounded-sm px-4 py-2">
                  ✓ ACQUISITION COMPLETE — Check your Downloads folder.
                </motion.div>
              )}
            </AnimatePresence>

            {/* Download button */}
            <div className="px-5 pb-5 pt-3">
              <motion.button onClick={handleDownload} disabled={!canDownload} whileTap={{ scale:0.97 }}
                className={`w-full font-display font-semibold tracking-[0.2em] text-sm py-4 rounded-sm border transition-all duration-300 uppercase
                  ${canDownload
                    ? "bg-cyan-500/15 border-cyan-500 text-cyan-300 hover:bg-cyan-500/25 hover:text-white pulse-loading"
                    : status === "downloading"
                    ? "bg-purple-500/15 border-purple-500/60 text-purple-300 cursor-not-allowed"
                    : status === "complete"
                    ? "bg-green-500/10 border-green-500/40 text-green-400 cursor-not-allowed"
                    : "opacity-0 pointer-events-none"}`}>
                {status === "downloading"
                  ? `◈ Transferring... ${progress}%`
                  : status === "complete"
                  ? "✓ Download Complete"
                  : selectedMedia
                  ? `⬇ Download ${qualityLabel(selectedMedia.quality)} · ${selectedMedia.extension.toUpperCase()}${selectedMedia.size ? " · " + formatBytes(selectedMedia.size) : ""}`
                  : "⬇ Initiate Download"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.2 }}
        className="text-center font-mono text-[9px] text-slate-800 tracking-widest">
        NEXLOAD // CYBERNETIC MEDIA ACQUISITION // USE RESPONSIBLY
      </motion.p>
    </div>
  );
}
