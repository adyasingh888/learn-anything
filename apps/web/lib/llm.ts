/**
 * Browser-side LLM client. Talks to /api/llm (a zero-retention proxy). If no
 * provider is configured server-side, the route signals a fallback and we use
 * the offline HeuristicProvider from core so the app always works.
 *
 * Privacy: the caller passes `allowCloud`. When false (device-only Privacy
 * Mode) we never hit the network and stay fully local.
 */
import { HeuristicProvider, type LLMMessage, type LLMProvider } from "@learn-anything/core";

const heuristic = new HeuristicProvider();

export interface ClientLLMOptions {
  allowCloud: boolean;
}

export function getProvider(opts: ClientLLMOptions): LLMProvider {
  if (!opts.allowCloud) return heuristic;
  return {
    id: "cloud-proxy",
    local: false,
    async complete(messages: LLMMessage[], o?: { json?: boolean }) {
      try {
        const res = await fetch("/api/llm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, json: o?.json }),
        });
        if (!res.ok) throw new Error(`llm ${res.status}`);
        const data = (await res.json()) as { text?: string; fallback?: boolean };
        if (data.fallback || !data.text) return heuristic.complete(messages);
        return data.text;
      } catch {
        return heuristic.complete(messages);
      }
    },
  };
}
