/**
 * Feature gates for free / pro / team tiers (local-first; Stripe-ready).
 */
import type { LocalAccount } from "./auth";

export type Feature =
  | "cloud-llm-unlimited"
  | "brain-sync"
  | "collaboration"
  | "share-links"
  | "media-storage"
  | "advanced-metrics";

const FREE_FEATURES: Feature[] = ["share-links"];
const PRO_FEATURES: Feature[] = [
  ...FREE_FEATURES,
  "cloud-llm-unlimited",
  "brain-sync",
  "media-storage",
  "advanced-metrics",
];
const TEAM_FEATURES: Feature[] = [...PRO_FEATURES, "collaboration"];

export function featuresForPlan(plan: LocalAccount["plan"]): Feature[] {
  switch (plan) {
    case "team":
      return TEAM_FEATURES;
    case "pro":
      return PRO_FEATURES;
    default:
      return FREE_FEATURES;
  }
}

export function hasFeature(account: LocalAccount | null, feature: Feature): boolean {
  if (!account) return FREE_FEATURES.includes(feature);
  return featuresForPlan(account.plan).includes(feature);
}

export const PLAN_LABELS: Record<LocalAccount["plan"], string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
};

export const PLAN_PRICES: Record<LocalAccount["plan"], string> = {
  free: "$0",
  pro: "$12/mo",
  team: "$29/mo",
};
