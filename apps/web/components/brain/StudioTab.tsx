"use client";
import { useEffect, useRef, useState } from "react";
import { useBrain } from "@/lib/store";
import { MemoryStudio } from "./studio/MemoryStudio";
import { ProjectStudio } from "./studio/ProjectStudio";
import { CreativeStudio } from "./studio/CreativeStudio";
import { CodeDrillStudio } from "./studio/CodeDrillStudio";
import { PerformanceStudio } from "./studio/PerformanceStudio";
import { LanguageStudio } from "./studio/LanguageStudio";
import { ExamStudio } from "./studio/ExamStudio";
import { ResearchStudio } from "./studio/ResearchStudio";
import { TeachBackStudio } from "./studio/TeachBackStudio";
import { FreeRecallStudio } from "./studio/FreeRecallStudio";

export function StudioTab({ brainId }: { brainId: string }) {
  const { brain } = useBrain(brainId);
  if (!brain) return null;
  switch (brain.domainType) {
    case "performance":
      return <PerformanceStudio brainId={brainId} />;
    case "language":
      return <LanguageStudio brainId={brainId} />;
    case "exam":
      return <ExamStudio brainId={brainId} />;
    case "research":
      return <ResearchStudio brainId={brainId} />;
    case "procedural":
      return <CodeDrillStudio brainId={brainId} />;
    case "creative":
      return <CreativeStudio brainId={brainId} />;
    case "memory":
      return <MemoryStudio brainId={brainId} />;
    case "project":
      return <ProjectStudio brainId={brainId} />;
    case "general":
    case "concept":
      return <FreeRecallStudio brainId={brainId} />;
    default:
      return <TeachBackStudio brainId={brainId} />;
  }
}

// Shared recorder hook used by several studios.
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      return stream;
    } catch {
      alert("Microphone permission is needed to record.");
      return null;
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  return { recording, url, seconds, start, stop, stream: streamRef };
}
