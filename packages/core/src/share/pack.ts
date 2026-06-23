/**
 * Encoded share pack for read-only brain links (no server storage).
 */
import type { BrainExportSlice } from "../export/markdown.js";

export interface SharePack {
  v: 1;
  role: "viewer";
  slice: BrainExportSlice;
  createdAt: number;
}

export function encodeSharePack(slice: BrainExportSlice): string {
  const pack: SharePack = { v: 1, role: "viewer", slice, createdAt: Date.now() };
  const json = JSON.stringify(pack);
  if (typeof btoa !== "undefined") {
    return btoa(unescape(encodeURIComponent(json)));
  }
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeSharePack(token: string): SharePack | null {
  try {
    let json: string;
    if (typeof atob !== "undefined") {
      json = decodeURIComponent(escape(atob(token)));
    } else {
      json = Buffer.from(token, "base64url").toString("utf8");
    }
    const pack = JSON.parse(json) as SharePack;
    if (pack.v !== 1 || !pack.slice) return null;
    return pack;
  } catch {
    return null;
  }
}
