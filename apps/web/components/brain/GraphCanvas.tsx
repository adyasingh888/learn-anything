"use client";
import { useMemo, useRef, useState } from "react";
import type { Atom, Edge, EdgeRelation } from "@learn-anything/core";
import { useBrain } from "@/lib/store";

const RELATION_COLOR: Record<EdgeRelation, string> = {
  related: "var(--color-muted)",
  supports: "#16a34a",
  contradicts: "#dc2626",
  prerequisite: "#2563eb",
  "example-of": "#9333ea",
  "part-of": "#0891b2",
  defines: "#ca8a04",
};

export function GraphCanvas({ brainId, onSelectAtom }: { brainId: string; onSelectAtom?: (id: string) => void }) {
  const { atoms, edges } = useBrain(brainId);
  const confirmed = edges.filter((e) => e.weight >= 1);
  const [selected, setSelected] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const layout = useMemo(() => layoutNodes(atoms, confirmed), [atoms, confirmed]);

  if (atoms.length === 0) return null;

  const w = 640;
  const h = 360;

  return (
    <div className="card-surface overflow-hidden rounded-xl">
      <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} className="w-full bg-[var(--color-bg-soft)]" role="img" aria-label="Knowledge graph">
        {confirmed.map((e) => {
          const a = layout.get(e.from);
          const b = layout.get(e.to);
          if (!a || !b) return null;
          return (
            <line
              key={e.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={RELATION_COLOR[e.relation] ?? RELATION_COLOR.related}
              strokeWidth={e.relation === "related" ? 1 : 2}
              strokeOpacity={0.7}
            />
          );
        })}
        {atoms.map((atom) => {
          const pos = layout.get(atom.id);
          if (!pos) return null;
          const active = selected === atom.id;
          return (
            <g
              key={atom.id}
              className="cursor-pointer"
              onClick={() => {
                setSelected(atom.id);
                onSelectAtom?.(atom.id);
              }}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={active ? 14 : 10}
                fill={active ? "var(--color-accent)" : "var(--color-accent-soft)"}
                stroke="var(--color-accent)"
                strokeWidth={active ? 2 : 1}
              />
              <text
                x={pos.x}
                y={pos.y + 22}
                textAnchor="middle"
                className="fill-[var(--color-text-secondary)] text-[9px]"
              >
                {atom.title.slice(0, 18)}{atom.title.length > 18 ? "…" : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="border-t border-[var(--color-line)] px-3 py-2 text-[10px] text-[var(--color-muted)]">
        {confirmed.length} links · click a node · green = supports · red = contradicts
      </p>
    </div>
  );
}

function layoutNodes(
  atoms: Atom[],
  edges: Edge[],
): Map<string, { x: number; y: number }> {
  const w = 640;
  const h = 360;
  const cx = w / 2;
  const cy = h / 2;
  const positions = new Map<string, { x: number; y: number }>();

  if (atoms.length === 1) {
    positions.set(atoms[0].id, { x: cx, y: cy });
    return positions;
  }

  // Seed on a circle, then light force iterations.
  const radius = Math.min(w, h) * 0.35;
  atoms.forEach((a, i) => {
    const angle = (2 * Math.PI * i) / atoms.length;
    positions.set(a.id, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  });

  for (let iter = 0; iter < 40; iter++) {
    // Repulsion
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const pi = positions.get(atoms[i].id)!;
        const pj = positions.get(atoms[j].id)!;
        let dx = pi.x - pj.x;
        let dy = pi.y - pj.y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const force = 1200 / (dist * dist);
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        pi.x += dx;
        pi.y += dy;
        pj.x -= dx;
        pj.y -= dy;
      }
    }
    // Attraction along edges
    for (const e of edges) {
      const a = positions.get(e.from);
      const b = positions.get(e.to);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.hypot(dx, dy), 1);
      const pull = (dist - 90) * 0.05;
      a.x += (dx / dist) * pull;
      a.y += (dy / dist) * pull;
      b.x -= (dx / dist) * pull;
      b.y -= (dy / dist) * pull;
    }
    // Keep in bounds
    for (const a of atoms) {
      const p = positions.get(a.id)!;
      p.x = Math.max(40, Math.min(w - 40, p.x));
      p.y = Math.max(30, Math.min(h - 40, p.y));
    }
  }

  return positions;
}
