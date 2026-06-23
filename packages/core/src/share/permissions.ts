/**
 * Share permissions + redaction for collaborative/export flows.
 */
import type { Brain, PrivacyPolicy } from "../types.js";

export type ShareRole = "owner" | "editor" | "viewer";

export interface SharePermissions {
  role: ShareRole;
  canWrite: boolean;
  canExport: boolean;
  canUseCloud: boolean;
}

export function permissionsForRole(role: ShareRole): SharePermissions {
  switch (role) {
    case "owner":
      return { role, canWrite: true, canExport: true, canUseCloud: true };
    case "editor":
      return { role, canWrite: true, canExport: true, canUseCloud: false };
    case "viewer":
      return { role, canWrite: false, canExport: false, canUseCloud: false };
  }
}

export interface SharePolicy extends PrivacyPolicy {
  shareLevel?: "private" | "link" | "team";
  redactSourceText?: boolean;
}

export function redactForViewer<T extends { text?: string }>(items: T[], policy: SharePolicy): T[] {
  if (!policy.redactSourceText) return items;
  return items.map((item) => ({
    ...item,
    text: item.text ? `${item.text.slice(0, 120)}… [redacted]` : item.text,
  }));
}

export function canShareBrain(brain: Brain): boolean {
  return brain.privacy.aiProcessing !== "device" || brain.privacy.allowCloudGeneration === false;
}
