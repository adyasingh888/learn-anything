"use client";
import { useCallback, useMemo, useRef, useState } from "react";
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

const W = 640;
const H = 400;

export function GraphCanvas({ brainId, onSelectAtom }: { brainId: string; onSelectAtom?: (id: string) => void }) {
  const { atoms, edges } = useBrain(brainId);
  const confirmed = edges.filter((e) => e.weight >= 1);
  const proposed = edges.filter((e) => e.weight < 1);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ active: boolean; sx: number; sy: number; px: number; py: number }>({
    active: false,
    sx: 0,
    sy: 0,
    px: 0,
    py: 0,
  });

  const layout = useMemo(() => layoutNodes(atoms, confirmed), [atoms, confirmed]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(2.5, Math.max(0.6, z * (e.deltaY > 0 ? 0.92 : 1.08))));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest("circle")) return;
    drag.current = { active: true, sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    setPan({
      x: drag.current.px + (e.clientX - drag.current.sx) / zoom,
      y: drag.current.py + (e.clientY - drag.current.sy) / zoom,
    });
  };

  const onPointerUp = () => {
    drag.current.active = false;
  };

  if (atoms.length === 0) return null;

  return (
    <div className="card-surface overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-3 py-2">
        <p className="text-xs text-[var(--color-muted)]">
          {atoms.length} nodes · {confirmed.length} links
        </p>
        <div className="flex gap-1">
          <button type="button" className="btn text-xs" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            Reset view
          </button>
          <button type="button" className="btn text-xs" onClick={() => setZoom((z) => Math.min(2.5, z * 1.15))}>+</button>
          <button type="button" className="btn text-xs" onClick={() => setZoom((z) => Math.max(0.6, z * 0.85))}>−</button>
        </div>
      </div>
      <svg
        viewBox={`${-pan.x} ${-pan.y} ${W / zoom} ${H / zoom}`}
        className="w-full cursor-grab bg-[var(--color-bg-soft)] active:cursor-grabbing"
        style={{ height: 320 }}
        role="img"
        aria-label="Knowledge graph"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {proposed.map((e) => {
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
              stroke="var(--color-muted)"
              strokeWidth={1}
              strokeDasharray="4 4"
              strokeOpacity={0.35}
            />
          );
        })}
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
              strokeWidth={e.relation === "related" ? 1.5 : 2.5}
              strokeOpacity={0.75}
            />
          );
        })}
        {atoms.map((atom) => {
          const pos = layout.get(atom.id);
          if (!pos) return null;
          const active = selected === atom.id;
          const linked = confirmed.some((e) => e.from === atom.id || e.to === atom.id);
          return (
            <g
              key={atom.id}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelected(atom.id);
                onSelectAtom?.(atom.id);
              }}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={active ? 16 : linked ? 12 : 9}
                fill={active ? "var(--color-accent)" : linked ? "var(--color-accent-soft)" : "var(--color-bg)"}
                stroke="var(--color-accent)"
                strokeWidth={active ? 2.5 : 1.5}
              />
              <text
                x={pos.x}
                y={pos.y + (active ? 26 : 22)}
                textAnchor="middle"
                className="fill-[var(--color-text-secondary)] text-[9px] pointer-events-none"
              >
                {atom.title.slice(0, 22)}{atom.title.length > 22 ? "…" : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="border-t border-[var(--color-line)] px-3 py-2 text-[10px] text-[var(--color-muted)]">
        Scroll to zoom · drag background to pan · dashed = suggested links · green/red = supports/contradicts
      </p>
    </div>
  );
}

function layoutNodes(atoms: Atom[], edges: Edge[]): Map<string, { x: number; y: number }> {
  const cx = W / 2;
  const cy = H / 2;
  const positions = new Map<string, { x: number; y: number }>();

  if (atoms.length === 1) {
    positions.set(atoms[0].id, { x: cx, y: cy });
    return positions;
  }

  const radius = Math.min(W, H) * 0.34;
  atoms.forEach((a, i) => {
    const angle = (2 * Math.PI * i) / atoms.length;
    positions.set(a.id, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  });

  for (let iter = 0; iter < 50; iter++) {
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const pi = positions.get(atoms[i].id)!;
        const pj = positions.get(atoms[j].id)!;
        let dx = pi.x - pj.x;
        let dy = pi.y - pj.y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const force = 1400 / (dist * dist);
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        pi.x += dx;
        pi.y += dy;
        pj.x -= dx;
        pj.y -= dy;
      }
    }
    for (const e of edges) {
      const a = positions.get(e.from);
      const b = positions.get(e.to);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.hypot(dx, dy), 1);
      const pull = (dist - 100) * 0.06;
      a.x += (dx / dist) * pull;
      a.y += (dy / dist) * pull;
      b.x -= (dx / dist) * pull;
      b.y -= (dy / dist) * pull;
    }
    for (const a of atoms) {
      const p = positions.get(a.id)!;
      p.x = Math.max(48, Math.min(W - 48, p.x));
      p.y = Math.max(36, Math.min(H - 48, p.y));
    }
  }

  return positions;
}
