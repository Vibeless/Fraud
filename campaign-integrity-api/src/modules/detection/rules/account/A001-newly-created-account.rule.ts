import { DetectionRule, DetectionSnapshot } from '../rule.interface';
import { Finding } from '../../finding.types';

/**
 * A001 — Newly Created Account.
 *
 * Illustrative rule proving the pattern end-to-end; not a claim about
 * real-world thresholds. Tune ACCOUNT_AGE_THRESHOLD_DAYS against the
 * Detection Signal Research / Rule Library Specification before relying
 * on this in production — those docs own the actual threshold values,
 * this file does not.
 */
const ACCOUNT_AGE_THRESHOLD_DAYS = 30;
const RULE_ID = 'A001';
const RULE_VERSION = '2026.08.0';

export class NewlyCreatedAccountRule implements DetectionRule {
  readonly ruleId = RULE_ID;
  readonly ruleVersion = RULE_VERSION;
  readonly analyzer = 'account' as const;
  readonly category = 'account_age';

  evaluate(snapshot: DetectionSnapshot): Finding | null {
    const accountAgeDays = daysBetween(
      new Date(snapshot.account.createdAt),
      new Date(snapshot.post.createdAt),
    );

    // Boundary is inclusive of the threshold itself — an account exactly
    // 30 days old does NOT fire. Deliberate, not accidental; see
    // docs/specs/10_Testing_Strategy.md §3.1 on boundary tests.
    if (accountAgeDays >= ACCOUNT_AGE_THRESHOLD_DAYS) {
      return null;
    }

    return {
      findingId: `F-${RULE_ID}`,
      ruleId: RULE_ID,
      ruleVersion: RULE_VERSION,
      analyzer: this.analyzer,
      category: this.category,
      severity: accountAgeDays < 7 ? 'high' : 'medium',
      confidence: 0.7,
      summary: `Account was created ${accountAgeDays} day${accountAgeDays === 1 ? '' : 's'} before this post, under the ${ACCOUNT_AGE_THRESHOLD_DAYS}-day threshold.`,
      details: { accountAgeDays, threshold: ACCOUNT_AGE_THRESHOLD_DAYS },
      isInternalOnly: false,
    };
  }
}

function daysBetween(earlier: Date, later: Date): number {
  const ms = later.getTime() - earlier.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
