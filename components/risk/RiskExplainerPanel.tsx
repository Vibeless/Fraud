'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';

export interface RiskExplainerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ANALYZER_EXPLANATIONS = [
  {
    category: 'Post Content & Metadata',
    badge: 'Post',
    description:
      'Evaluates post creation timestamps, duplicate text patterns across multiple accounts, spam hashtag clusters, and post engagement velocity markers.',
  },
  {
    category: 'Creator Account History',
    badge: 'Account',
    description:
      'Reviews the authoring account age, profile completeness, handle structure, and historical posting patterns to identify freshly spun-up burner accounts.',
  },
  {
    category: 'Engagement & Velocity Patterns',
    badge: 'Engagement',
    description:
      'Analyzes how quickly likes, reposts, and comments arrive after posting. Natural organic engagement builds progressively, whereas purchased engagement often arrives in sudden, unnatural spikes.',
  },
  {
    category: 'Audience Quality & Composition',
    badge: 'Audience',
    description:
      'Inspects the profiles interacting with the post. Flags high concentrations of dormant accounts, accounts with zero followers, default avatars, or suspicious follower-to-following ratios.',
  },
  {
    category: 'Coordinated Bot Behavior',
    badge: 'Behavior',
    description:
      'Detects synchronized repost loops, copy-paste commenting clusters, and automated bot networks executing identical interaction routines across unrelated campaigns.',
  },
];

/**
 * Explanatory panel describing the analyzer categories in plain language per DUXS §4.3.
 *
 * NOTE: Designed to provide explainability without exposing internal scoring thresholds,
 * formulas, or classifier weights (DES §9).
 */
export function RiskExplainerPanel({ isOpen, onClose }: RiskExplainerPanelProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How is the Risk Score Calculated?"
      description="Campaign Integrity analyzes engagement signals across five specialized analyzers to surface transparent evidence for human reviewers."
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Core Philosophy Banner */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
          <span className="font-semibold text-slate-900">Explainability First: </span>
          The Risk Score (0–100) aggregates evidence across five analyzers to assess engagement integrity. The platform never renders an automated “bot / not bot” verdict — all evidence is presented directly to the campaign manager or fraud reviewer to make the final determination.
        </div>

        {/* Categories List */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Detection Analyzer Categories
          </h4>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {ANALYZER_EXPLANATIONS.map((item) => (
              <div key={item.badge} className="p-4 bg-white hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                    {item.badge}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-normal pl-0.5 mt-1">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Score Thresholds */}
        <div className="border-t border-slate-100 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Risk Level Tiers
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
              <div className="font-bold">Low</div>
              <div className="text-[11px] text-emerald-700">0 – 24</div>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <div className="font-bold">Moderate</div>
              <div className="text-[11px] text-amber-700">25 – 49</div>
            </div>
            <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-800">
              <div className="font-bold">High</div>
              <div className="text-[11px] text-orange-700">50 – 74</div>
            </div>
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800">
              <div className="font-bold">Critical</div>
              <div className="text-[11px] text-red-700">75 – 100</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
