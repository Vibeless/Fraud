import { Injectable } from "@nestjs/common";
import { DetectionRule, DetectionSnapshot } from "./rules/rule.interface";
import { Finding } from "./finding.types";
import { NewlyCreatedAccountRule } from "./rules/account/A001-newly-created-account.rule";

/**
 * The rule registry. Adding a rule means adding one line here — see
 * .agents/skills/add-detection-rule/SKILL.md for the full checklist
 * (file location, required tests, version bump, branch naming).
 *
 * TRIMMED STARTER STATE: only A001 is registered. This is deliberately
 * one rule, not a library — it exists to prove the collector -> validator
 * -> rule -> aggregator -> evidence pipeline end-to-end. Adding the next
 * rule (an E-xxx engagement rule is a natural second one, per the Rule
 * Library Specification's analyzer categories) is a good first real task.
 *
 * This is intentionally a flat in-memory list, not dynamic file-system
 * discovery — explicit registration means a new rule can't silently start
 * firing in production just by landing in the right folder without
 * being reviewed into this list.
 */
const REGISTERED_RULES: DetectionRule[] = [new NewlyCreatedAccountRule()];

@Injectable()
export class RuleEngineService {
  private readonly rules = REGISTERED_RULES;

  /** Runs every registered rule for the given analyzer against a snapshot. */
  runAnalyzer(
    analyzer: Finding["analyzer"],
    snapshot: DetectionSnapshot,
  ): Finding[] {
    return this.rules
      .filter((rule) => rule.analyzer === analyzer)
      .map((rule) => rule.evaluate(snapshot))
      .filter((finding): finding is Finding => finding !== null);
  }

  /** Runs every registered rule across all analyzers. */
  runAll(snapshot: DetectionSnapshot): Finding[] {
    return this.rules
      .map((rule) => rule.evaluate(snapshot))
      .filter((finding): finding is Finding => finding !== null);
  }
}
