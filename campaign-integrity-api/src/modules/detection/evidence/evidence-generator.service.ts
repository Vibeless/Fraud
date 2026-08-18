import { Injectable } from "@nestjs/common";
import { Finding } from "../finding.types";

export interface Evidence {
  category: string;
  severity: Finding["severity"];
  summary: string;
}

const CATEGORY_SUMMARY_PHRASES: Record<string, string> = {
  engagement: "signs of artificial engagement velocity and patterns",
  timing: "engagement velocity spiked unnaturally close to posting time",
  audience: "anomalous follower composition and suspicious audience quality",
  account: "creator account exhibits characteristics of a newly created profile",
  behavior: "patterns consistent with automated bot activity",
  coordination: "synchronized engagement clusters detected across coordinated accounts",
  bot_network: "engagement originating from known bot networks",
  historical: "metrics deviate significantly from historical creator baseline",
  post: "post characteristics indicate inorganic distribution patterns",
};

const DEFAULT_LEVEL_SUMMARIES: Record<string, string> = {
  low: "Low risk — no significant anomalies detected.",
  moderate: "Moderate risk — minor irregularities detected across signals.",
  high: "High risk — elevated risk indicators detected.",
  critical: "Critical risk — high-severity anomalies detected.",
};

/**
 * Findings[] -> public Evidence[] and riskSummary — the ONLY place internal
 * Finding fields (ruleId, confidence, details, analyzer-internal weighting) are
 * stripped before anything reaches an API response. See
 * docs/specs/02_API_Specification_OAS.md §5 for the exact shape this feeds into,
 * and Detection Engine Spec §9 for what must never leak.
 *
 * isInternalOnly findings are excluded entirely — they inform the Risk
 * Score (via the aggregator) but are never surfaced as Evidence or in the summary.
 */
@Injectable()
export class EvidenceGeneratorService {
  generate(findings: Finding[]): Evidence[] {
    return this.getPublicFindings(findings).map((f) => ({
      category: f.category,
      severity: f.severity,
      summary: f.summary,
    }));
  }

  generateSummary(
    riskLevel: string | null | undefined,
    findings: Finding[],
  ): string {
    const normalizedLevel = (riskLevel || "low").toLowerCase();
    const publicFindings = this.getPublicFindings(findings);

    if (publicFindings.length === 0) {
      return (
        DEFAULT_LEVEL_SUMMARIES[normalizedLevel] ||
        `${capitalize(normalizedLevel)} risk — no significant anomalies detected.`
      );
    }

    const topFinding = publicFindings[0];
    const categoryKey = (topFinding.category || "").toLowerCase();
    const phrase =
      CATEGORY_SUMMARY_PHRASES[categoryKey] ||
      `anomalies detected in ${topFinding.category} signals`;

    return `${capitalize(normalizedLevel)} risk — ${phrase}.`;
  }

  private getPublicFindings(findings: Finding[]): Finding[] {
    return (findings || [])
      .filter((f) => !f.isInternalOnly)
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  }
}

function severityRank(severity: Finding["severity"]): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[severity] ?? 0;
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
