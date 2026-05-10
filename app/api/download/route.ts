import { NextRequest, NextResponse } from "next/server";

const RAPIDAPI_ENDPOINT = "https://social-download-all-in-one.p.rapidapi.com/v1/social/autolink";
const RAPIDAPI_HOST     = "social-download-all-in-one.p.rapidapi.com";

interface RapidAPIMedia {
  url: string; quality: string; extension: string;
  type: "video" | "audio"; data_size?: number; width?: number; height?: number;
}
interface RapidAPIStatistics {
  digg_count: number; comment_count: number; play_count: number;
  share_count: number; collect_count: number;
}
interface RapidAPIResponse {
  source: string; title: string; thumbnail: string; duration: number;
  author?: string; unique_id?: string; statistics?: RapidAPIStatistics;
  medias: RapidAPIMedia[]; error: boolean;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "0:00";
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
function formatCount(n: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
function mapPlatform(source: string): string {
  const map: Record<string, string> = {
    tiktok:"tiktok", youtube:"youtube", instagram:"instagram",
    twitter:"twitter", facebook:"facebook", vimeo:"vimeo", x:"twitter",
  };
  return map[source?.toLowerCase()] ?? source?.toLowerCase() ?? "unknown";
}
function pickBest(medias: RapidAPIMedia[]): RapidAPIMedia | null {
  if (!medias?.length) return null;
  for (const q of ["hd_no_watermark","no_watermark"]) {
    const m = medias.find((x) => x.type === "video" && x.quality === q && x.url);
    if (m) return m;
  }
  return medias.find((x) => x.type === "video" && x.url) ?? medias.find((x) => x.url) ?? null;
}

// ── GET /api/download?proxyUrl=... ─────────────────────────────────────────
// Proxies the actual file download through the server to bypass CORS
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const proxyUrl  = searchParams.get("proxyUrl");
  const filename  = searchParams.get("filename") ?? "nexload-video.mp4";

  if (!proxyUrl) {
    return NextResponse.json({ error: "Missing proxyUrl parameter." }, { status: 400 });
  }

  try {
    const response = await fetch(decodeURIComponent(proxyUrl), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.tiktok.com/",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Upstream fetch failed (${response.status})` }, { status: 502 });
    }

    const contentType   = response.headers.get("content-type")  ?? "video/mp4";
    const contentLength = response.headers.get("content-length") ?? "";

    const headers = new Headers({
      "Content-Type":        contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-cache",
    });
    if (contentLength) headers.set("Content-Length", contentLength);

    return new NextResponse(response.body, { status: 200, headers });

  } catch (err) {
    console.error("Proxy error:", err);
    return NextResponse.json({ error: "Failed to proxy download." }, { status: 502 });
  }
}

// ── POST /api/download ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    let body: { url?: string };
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

    const { url } = body;
    if (!url?.trim()) return NextResponse.json({ error: "Missing 'url' field." }, { status: 400 });

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    if (!RAPIDAPI_KEY) {
      console.error("RAPIDAPI_KEY not set.");
      return NextResponse.json({ error: "Server config error." }, { status: 500 });
    }

    let rapidRes: Response;
    try {
      rapidRes = await fetch(RAPIDAPI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": RAPIDAPI_HOST,
        },
        body: JSON.stringify({ url: url.trim() }),
      });
    } catch (e) {
      console.error("Network error:", e);
      return NextResponse.json({ error: "Could not reach download service." }, { status: 502 });
    }

    if (!rapidRes.ok) {
      const txt = await rapidRes.text().catch(() => "");
      console.error(`RapidAPI ${rapidRes.status}:`, txt);
      if (rapidRes.status === 401 || rapidRes.status === 403)
        return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
      if (rapidRes.status === 429)
        return NextResponse.json({ error: "Rate limit hit. Try again shortly." }, { status: 429 });
      return NextResponse.json({ error: `Service error (${rapidRes.status}).` }, { status: 502 });
    }

    let data: RapidAPIResponse;
    try { data = await rapidRes.json(); }
    catch { return NextResponse.json({ error: "Bad response from service." }, { status: 502 }); }

    if (data.error)
      return NextResponse.json({ error: "Video is private, deleted, or unsupported." }, { status: 422 });
    if (!data.medias?.length)
      return NextResponse.json({ error: "No downloadable media found." }, { status: 422 });

    const best = pickBest(data.medias);
    if (!best) return NextResponse.json({ error: "Could not extract download URL." }, { status: 422 });

    const mediaOptions = data.medias
      .filter((m) => m.quality !== "watermark")
      .map((m) => ({ url:m.url, quality:m.quality, extension:m.extension,
        type:m.type, size:m.data_size??0, width:m.width??0, height:m.height??0 }));

    return NextResponse.json({
      title:       data.title     || "Untitled Video",
      thumbnail:   data.thumbnail || "",
      duration:    formatDuration(data.duration),
      platform:    mapPlatform(data.source),
      author:      data.unique_id || data.author || "",
      downloadUrl: best.url,
      quality:     best.quality,
      extension:   best.extension || "mp4",
      mediaOptions,
      stats: data.statistics ? {
        likes:    formatCount(data.statistics.digg_count),
        comments: formatCount(data.statistics.comment_count),
        views:    formatCount(data.statistics.play_count),
        shares:   formatCount(data.statistics.share_count),
        saves:    formatCount(data.statistics.collect_count),
      } : null,
    }, { status: 200 });

  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
