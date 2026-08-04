import { Injectable } from "@nestjs/common";
import { DetectionSnapshot } from "../rules/rule.interface";

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Detection Engine Spec, Stage 2 — Validation. Confirms the collected
 * data is analyzable before spending analyzer/rule time on it: the post
 * exists, is public, and has the minimum fields every analyzer expects.
 *
 * This is intentionally conservative and easy to extend — add checks
 * here as real X API edge cases show up (deleted post, protected
 * account, suspended account, etc.) rather than letting analyzers each
 * defensively re-check the same things.
 */
@Injectable()
export class ValidatorService {
  validate(snapshot: DetectionSnapshot): ValidationResult {
    if (!snapshot.post?.id) {
      return { valid: false, reason: "Post data is missing or malformed." };
    }
    if (!snapshot.account?.xUserId) {
      return { valid: false, reason: "Account data is missing or malformed." };
    }
    return { valid: true };
  }
}
