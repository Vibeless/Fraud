import { EvidenceGeneratorService } from "../../../../../src/modules/detection/evidence/evidence-generator.service";
import { Finding } from "../../../../../src/modules/detection/finding.types";

describe("EvidenceGeneratorService (Unit)", () => {
  let service: EvidenceGeneratorService;

  beforeEach(() => {
    service = new EvidenceGeneratorService();
  });

  describe("generate", () => {
    it("should strip internal fields and sort by severity descending", () => {
      const findings: Finding[] = [
        {
          findingId: "f-1",
          ruleId: "RULE_LOW",
          analyzer: "engagement",
          category: "engagement",
          severity: "low",
          confidence: 0.7,
          summary: "Low severity finding.",
          details: { secret: 123 },
          isInternalOnly: false,
          ruleVersion: "1.0.0",
        },
        {
          findingId: "f-2",
          ruleId: "RULE_HIGH",
          analyzer: "engagement",
          category: "timing",
          severity: "high",
          confidence: 0.95,
          summary: "High severity finding.",
          details: { secret: 456 },
          isInternalOnly: false,
          ruleVersion: "1.0.0",
        },
        {
          findingId: "f-internal",
          ruleId: "RULE_INTERNAL",
          analyzer: "behavior",
          category: "behavior",
          severity: "critical",
          confidence: 0.99,
          summary: "Internal only finding.",
          details: { secret: 789 },
          isInternalOnly: true,
          ruleVersion: "1.0.0",
        },
      ];

      const result = service.generate(findings);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        category: "timing",
        severity: "high",
        summary: "High severity finding.",
      });
      expect(result[1]).toEqual({
        category: "engagement",
        severity: "low",
        summary: "Low severity finding.",
      });
      expect(result).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ isInternalOnly: true }),
          expect.objectContaining({ details: expect.anything() }),
          expect.objectContaining({ confidence: expect.anything() }),
          expect.objectContaining({ ruleId: expect.anything() }),
        ]),
      );
    });
  });

  describe("generateSummary", () => {
    it("should produce a sentence referencing the correct category for a single high-severity finding", () => {
      const findings: Finding[] = [
        {
          findingId: "f-1",
          ruleId: "RULE_ENG",
          analyzer: "engagement",
          category: "engagement",
          severity: "high",
          confidence: 0.9,
          summary: "38% of likes came from new accounts.",
          details: {},
          isInternalOnly: false,
          ruleVersion: "1.0.0",
        },
      ];

      const summary = service.generateSummary("high", findings);
      expect(summary).toBe("High risk — signs of artificial engagement velocity and patterns.");
    });

    it("should base the sentence on the highest-severity finding when multiple findings exist", () => {
      const findings: Finding[] = [
        {
          findingId: "f-low",
          ruleId: "RULE_AUD_01",
          analyzer: "audience",
          category: "audience",
          severity: "low",
          confidence: 0.6,
          summary: "Minor audience variance.",
          details: {},
          isInternalOnly: false,
          ruleVersion: "1.0.0",
        },
        {
          findingId: "f-crit",
          ruleId: "RULE_COORD_01",
          analyzer: "coordination",
          category: "coordination",
          severity: "critical",
          confidence: 0.98,
          summary: "Coordinated cluster detected.",
          details: {},
          isInternalOnly: false,
          ruleVersion: "1.0.0",
        },
      ];

      const summary = service.generateSummary("critical", findings);
      expect(summary).toBe(
        "Critical risk — synchronized engagement clusters detected across coordinated accounts.",
      );
    });

    it("should produce a sensible sentence for zero findings", () => {
      const summaryLow = service.generateSummary("low", []);
      expect(summaryLow).toBe("Low risk — no significant anomalies detected.");

      const summaryMod = service.generateSummary("moderate", []);
      expect(summaryMod).toBe("Moderate risk — minor irregularities detected across signals.");

      const summaryHigh = service.generateSummary("high", []);
      expect(summaryHigh).toBe("High risk — elevated risk indicators detected.");
    });

    it("should never include isInternalOnly finding data in summary even if present in the input array", () => {
      const findings: Finding[] = [
        {
          findingId: "f-internal",
          ruleId: "RULE_SECRET",
          analyzer: "behavior",
          category: "behavior",
          severity: "critical",
          confidence: 0.99,
          summary: "Internal shadow-ban metric violated.",
          details: { shadowBanned: true },
          isInternalOnly: true,
          ruleVersion: "1.0.0",
        },
      ];

      // Since all findings are internal-only, it falls back cleanly to riskLevel-only summary
      const summary = service.generateSummary("low", findings);
      expect(summary).toBe("Low risk — no significant anomalies detected.");
      expect(summary).not.toContain("Internal");
      expect(summary).not.toContain("shadow-ban");
      expect(summary).not.toContain("behavior");
    });
  });
});
