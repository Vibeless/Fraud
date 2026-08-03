/**
 * The one shape every rule produces. Mirrors the `findings` table in
 * docs/specs/01_Database_Design_and_ERD_Specification_DDS.md §4 exactly —
 * this type and that table should never drift from each other.
 *
 * `details` is internal-only (never serialized into an API response).
 * `summary` is the only field ever shown to an agency.
 */
export interface Finding {
  findingId: string; // e.g. "F-E001"
  ruleId: string; // e.g. "E001" — matches the rule file's id, not a DB row
  ruleVersion: string;
  analyzer:
    | 'post'
    | 'account'
    | 'engagement'
    | 'audience'
    | 'behavior'
    | 'coordination'
    | 'bot_network'
    | 'historical';
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0.00–1.00
  summary: string; // reviewer-facing, plain language, exposed via the API
  details: Record<string, unknown>; // internal only — never exposed
  isInternalOnly: boolean;
}
