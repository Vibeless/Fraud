import { NewlyCreatedAccountRule } from "../../../src/modules/detection/rules/account/A001-newly-created-account.rule";
import { DetectionSnapshot } from "../../../src/modules/detection/rules/rule.interface";

function snapshotWithAccountAge(days: number): DetectionSnapshot {
  const postCreatedAt = new Date("2026-08-01T00:00:00Z");
  const accountCreatedAt = new Date(
    postCreatedAt.getTime() - days * 24 * 60 * 60 * 1000,
  );
  return {
    post: {
      id: "p1",
      createdAt: postCreatedAt.toISOString(),
      text: "hello",
      publicMetrics: { likeCount: 0, retweetCount: 0, replyCount: 0 },
    },
    account: {
      xUserId: "u1",
      xUsername: "testuser",
      createdAt: accountCreatedAt.toISOString(),
      followersCount: 10,
      followingCount: 10,
      verified: false,
    },
  };
}

describe("A001 NewlyCreatedAccountRule", () => {
  const rule = new NewlyCreatedAccountRule();

  it("positive: fires for an account created 3 days before the post", () => {
    const finding = rule.evaluate(snapshotWithAccountAge(3));
    expect(finding).not.toBeNull();
    expect(finding?.ruleId).toBe("A001");
    expect(finding?.severity).toBe("high");
  });

  it("negative: does not fire for an account created 365 days before the post", () => {
    const finding = rule.evaluate(snapshotWithAccountAge(365));
    expect(finding).toBeNull();
  });

  it("boundary: does not fire for an account exactly 30 days old", () => {
    const finding = rule.evaluate(snapshotWithAccountAge(30));
    expect(finding).toBeNull();
  });

  it("boundary: fires for an account 29 days old (one day inside the threshold)", () => {
    const finding = rule.evaluate(snapshotWithAccountAge(29));
    expect(finding).not.toBeNull();
    expect(finding?.severity).toBe("medium");
  });
});
