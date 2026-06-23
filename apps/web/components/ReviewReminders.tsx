"use client";
import { useEffect, useRef } from "react";
import { dueCount } from "@learn-anything/core";
import { useStore } from "@/lib/store";

const STORAGE_KEY = "la_review_reminders";

export function ReviewReminders() {
  const { db } = useStore();
  const pinged = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (localStorage.getItem(STORAGE_KEY) !== "on") return;

    const totalDue = db.brains.reduce(
      (s, b) => s + dueCount(db.cards.filter((c) => c.brainId === b.id)),
      0,
    );
    if (totalDue === 0 || pinged.current) return;
    if (Notification.permission !== "granted") return;

    const t = window.setTimeout(() => {
      new Notification("Learn Anything", {
        body: `${totalDue} card${totalDue === 1 ? "" : "s"} due for review`,
        tag: "review-due",
      });
      pinged.current = true;
    }, 4000);

    return () => window.clearTimeout(t);
  }, [db.brains, db.cards]);

  return null;
}

export function ReviewReminderToggle() {
  const enabled = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "on";

  const toggle = async () => {
    if (!("Notification" in window)) {
      alert("Notifications are not supported in this browser.");
      return;
    }
    if (localStorage.getItem(STORAGE_KEY) === "on") {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      localStorage.setItem(STORAGE_KEY, "on");
      window.location.reload();
    }
  };

  return (
    <button type="button" className="btn text-xs" onClick={toggle}>
      {enabled ? "🔔 Reminders on" : "Enable review reminders"}
    </button>
  );
}
