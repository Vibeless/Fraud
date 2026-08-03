import { Injectable } from '@nestjs/common';
import { Finding } from '../finding.types';

export interface Evidence {
  category: string;
  severity: Finding['severity'];
  summary: string;
}

/**
 * Findings[] -> public Evidence[] — the ONLY place internal Finding
 * fields (ruleId, confidence, details, analyzer-internal weighting) are
 * stripped before anything reaches an API response. See
 * docs/specs/02_API_Specification_OAS.md §5 for the exact shape this
 * feeds into, and Detection Engine Spec §9 for what must never leak.
 *
 * isInternalOnly findings are excluded entirely — they inform the Risk
 * Score (via the aggregator) but are never surfaced as Evidence.
 */
@Injectable()
export class EvidenceGeneratorService {
  generate(findings: Finding[]): Evidence[] {
    return findings
      .filter((f) => !f.isInternalOnly)
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((f) => ({
        category: f.category,
        severity: f.severity,
        summary: f.summary,
      }));
  }
}

function severityRank(severity: Finding['severity']): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[severity];
}
