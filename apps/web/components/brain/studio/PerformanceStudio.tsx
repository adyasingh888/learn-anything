"use client";
import { useEffect, useRef, useState } from "react";
import { analyzeRecordingMeta, newId, now } from "@learn-anything/core";
import { useBrain, useStore } from "@/lib/store";
import { useRecorder } from "../StudioTab";

export function PerformanceStudio({ brainId }: { brainId: string }) {
  const { logActivity, addMediaAsset } = useStore();
  const { activities } = useBrain(brainId);
  const rec = useRecorder();
  const [targetBpm, setTargetBpm] = useState(80);
  const [bpm, setBpm] = useState(80);
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState<string>("—");
  const [practiceLog, setPracticeLog] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [refUrl, setRefUrl] = useState<string | null>(null);
  const [practiceSec, setPracticeSec] = useState(0);

  const audioRef = useRef<AudioContext | null>(null);
  const metroTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pitchRaf = useRef<number | null>(null);
  const practiceTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Metronome (Web Audio) ---
  const click = () => {
    const ctx = (audioRef.current ??= new AudioContext());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  };

  const toggleMetro = () => {
    if (playing) {
      if (metroTimer.current) clearInterval(metroTimer.current);
      setPlaying(false);
    } else {
      click();
      metroTimer.current = setInterval(click, (60 / bpm) * 1000);
      setPlaying(true);
    }
  };

  useEffect(() => {
    if (playing && metroTimer.current) {
      clearInterval(metroTimer.current);
      metroTimer.current = setInterval(click, (60 / bpm) * 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm]);

  // --- Live pitch detection on the recording stream (autocorrelation) ---
  const startPitch = async () => {
    const stream = await rec.start();
    if (!stream) return;
    const ctx = (audioRef.current ??= new AudioContext());
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const loop = () => {
      analyser.getFloatTimeDomainData(buf);
      const freq = autoCorrelate(buf, ctx.sampleRate);
      if (freq > 0) setNote(freqToNote(freq));
      pitchRaf.current = requestAnimationFrame(loop);
    };
    loop();
    setPracticeLog(true);
    practiceTimer.current = setInterval(() => setPracticeSec((s) => s + 1), 1000);
  };

  const stopPitch = () => {
    rec.stop();
    if (pitchRaf.current) cancelAnimationFrame(pitchRaf.current);
    if (practiceTimer.current) clearInterval(practiceTimer.current);
    setPracticeLog(false);
    if (practiceSec > 0) {
      const meta = analyzeRecordingMeta({ durationSec: practiceSec, targetBpm: bpm });
      setAnalysis(meta.summary);
      logActivity({ brainId, kind: "recording", durationSec: practiceSec, score: meta.score });
      if (rec.url) {
        addMediaAsset({
          id: newId("media"),
          brainId,
          kind: "audio",
          ref: rec.url,
          durationSec: practiceSec,
          analysis: { bpm, score: meta.score },
          createdAt: now(),
        });
      }
    }
  };

  useEffect(() => () => {
    if (metroTimer.current) clearInterval(metroTimer.current);
    if (pitchRaf.current) cancelAnimationFrame(pitchRaf.current);
    if (practiceTimer.current) clearInterval(practiceTimer.current);
  }, []);

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--color-muted)]">
        Deliberate practice: set a slow tempo, record yourself, watch the pitch, then review the take.
      </p>

      <div className="card-surface rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Metronome</h3>
          <span className="text-2xl font-bold tabular-nums">{bpm} <span className="text-sm text-[var(--color-muted)]">bpm</span></span>
        </div>
        <input
          type="range"
          min={40}
          max={208}
          value={targetBpm}
          onChange={(e) => {
            const t = Number(e.target.value);
            setTargetBpm(t);
            setBpm(t);
          }}
          className="mt-3 w-full accent-[var(--color-accent)]"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {[0.5, 0.75, 1].map((pct) => (
            <button
              key={pct}
              type="button"
              className="btn text-xs"
              onClick={() => setBpm(Math.round(targetBpm * pct))}
            >
              {Math.round(pct * 100)}% ({Math.round(targetBpm * pct)} bpm)
            </button>
          ))}
        </div>
        <button className={`btn mt-3 ${playing ? "" : "btn-primary"}`} onClick={toggleMetro}>
          {playing ? "⏹ Stop" : "▶ Start"}
        </button>
      </div>

      <div className="card-surface rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Record & analyze</h3>
          <span className="chip">Pitch: {note}</span>
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Live note detection runs entirely on-device. Recordings stay local.
        </p>
        <div className="mt-3 flex items-center gap-3">
          {!rec.recording ? (
            <button className="btn btn-primary" onClick={startPitch}>● Record</button>
          ) : (
            <button className="btn" onClick={stopPitch}>⏹ Stop ({rec.seconds}s)</button>
          )}
          {practiceLog && <span className="text-xs text-[var(--color-accent-2)]">practicing… {practiceSec}s</span>}
        </div>
        {rec.url && (
          <div className="mt-3">
            <p className="text-xs text-[var(--color-muted)]">Last take — listen back and self-critique:</p>
            {analysis && <p className="mt-1 text-xs text-[var(--color-accent-2)]">{analysis}</p>}
            <audio controls src={rec.url} className="mt-2 w-full" />
          </div>
        )}
      </div>

      <div className="card-surface rounded-2xl p-4">
        <h3 className="text-sm font-semibold">Reference track</h3>
        <p className="mt-1 text-xs text-[var(--color-muted)]">Upload audio to practice against (stays local).</p>
        <input type="file" accept="audio/*" className="mt-2 text-xs" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setRefUrl(URL.createObjectURL(f));
        }} />
        {refUrl && <audio controls src={refUrl} className="mt-2 w-full" />}
      </div>

      {activities.filter((a) => a.kind === "recording").length > 0 && (
        <div className="card-surface rounded-2xl p-4">
          <h3 className="text-sm font-semibold">Practice history</h3>
          <ul className="mt-2 space-y-1 text-xs text-[var(--color-text-secondary)]">
            {activities.filter((a) => a.kind === "recording").slice(-5).reverse().map((a) => (
              <li key={a.id}>· {a.durationSec ?? 0}s{a.score != null ? ` · ${Math.round(a.score * 100)}%` : ""}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Autocorrelation pitch detection — returns fundamental frequency in Hz. */
function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.01) return -1; // too quiet

  let r1 = 0;
  let r2 = buf.length - 1;
  const thres = 0.2;
  for (let i = 0; i < buf.length / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < buf.length / 2; i++) if (Math.abs(buf[buf.length - i]) < thres) { r2 = buf.length - i; break; }
  const b = buf.slice(r1, r2);
  const c = new Array(b.length).fill(0);
  for (let i = 0; i < b.length; i++) for (let j = 0; j < b.length - i; j++) c[i] += b[j] * b[j + i];

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < b.length; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  if (maxpos <= 0) return -1;
  return sampleRate / maxpos;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function freqToNote(freq: number): string {
  const midi = Math.round(12 * Math.log2(freq / 440) + 69);
  if (!isFinite(midi) || midi < 0) return "—";
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
