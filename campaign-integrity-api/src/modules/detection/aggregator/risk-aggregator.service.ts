import { Injectable } from "@nestjs/common";
import { Finding } from "../finding.types";
import { RiskLevel } from "../../../database/entities";

const SEVERITY_WEIGHT: Record<Finding["severity"], number> = {
  low: 10,
  medium: 25,
  high: 45,
  critical: 70,
};

/**
 * Findings[] -> { riskScore, riskLevel }.
 *
 * PLACEHOLDER FORMULA — this is a simple weighted-max-plus-decay scheme
 * so the pipeline has a real, working, testable aggregation step. The
 * actual scoring formula (how signal weights combine, how confidence is
 * factored in, exact score-range boundaries) is owned by the Rule
 * Library Specification and the Risk Aggregator design in the Detection
 * Engine Specification — replace this with that formula rather than
 * tuning constants here blind. Risk Level thresholds below DO match
 * docs/specs/03_Dashboard_UX_Specification_DUXS.md §5.
 */
@Injectable()
export class RiskAggregatorService {
  aggregate(findings: Finding[]): { riskScore: number; riskLevel: RiskLevel } {
    // isInternalOnly affects what the Evidence Generator surfaces, not
    // what the aggregator scores — every Finding informs the score.
    if (findings.length === 0) {
      return { riskScore: 0, riskLevel: RiskLevel.LOW };
    }

    // Highest-severity finding dominates; additional findings add a
    // diminishing-returns contribution so ten "low" findings don't
    // silently outrank one "critical" finding.
    const sorted = [...findings].sort(
      (a, b) =>
        SEVERITY_WEIGHT[b.severity] * b.confidence -
        SEVERITY_WEIGHT[a.severity] * a.confidence,
    );

    let score = 0;
    sorted.forEach((finding, index) => {
      const contribution =
        SEVERITY_WEIGHT[finding.severity] * finding.confidence;
      const decay = 1 / (index + 1);
      score += contribution * decay;
    });

    const riskScore = Math.min(100, Math.round(score));
    return { riskScore, riskLevel: levelFor(riskScore) };
  }
}

function levelFor(score: number): RiskLevel {
  if (score >= 75) return RiskLevel.CRITICAL;
  if (score >= 50) return RiskLevel.HIGH;
  if (score >= 25) return RiskLevel.MODERATE;
  return RiskLevel.LOW;
}
