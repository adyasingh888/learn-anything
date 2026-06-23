/**
 * YouTube transcript fetch — no Google API key; uses public caption tracks.
 */

export async function fetchYouTubeTranscript(videoUrl: string): Promise<{
  text: string;
  title: string | null;
  channelName: string | null;
} | null> {
  try {
    const { fetchYouTubeTranscript } = await import("yt-transcript-kit");
    const result = await fetchYouTubeTranscript(videoUrl, { languages: ["en", "en-US", "en-GB"] });
    if (!result.fullText?.trim()) return null;
    return {
      text: result.fullText,
      title: result.title,
      channelName: result.channelName ?? null,
    };
  } catch {
    return null;
  }
}

export function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch {
    /* invalid */
  }
  return null;
}
