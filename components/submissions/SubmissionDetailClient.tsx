'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Submission,
  AnalysisResponse,
  reviewSubmission,
} from '@/lib/api-client/submissions';
import { RiskScoreBadge, RiskLevel } from '@/components/risk/RiskScoreBadge';
import { EvidenceList } from '@/components/risk/EvidenceList';
import { RiskExplainerPanel } from '@/components/risk/RiskExplainerPanel';
import { Button } from '@/components/ui/Button';

export interface SubmissionDetailClientProps {
  submission: Submission;
  analysis: AnalysisResponse | null;
  onRetry?: () => Promise<void>;
}

function parseCreatorHandle(postUrl: string): string {
  try {
    const match = postUrl.match(/(?:x\.com|twitter\.com)\/([^/]+)\/status/i);
    return match ? `@${match[1]}` : '@creator';
  } catch {
    return '@creator';
  }
}

function parsePostId(postUrl: string): string {
  try {
    const match = postUrl.match(/\/status\/(\d+)/i);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateStr;
  }
}


export function SubmissionDetailClient({
  submission,
  analysis,
  onRetry,
}: SubmissionDetailClientProps) {
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [reviewerNote, setReviewerNote] = useState(submission.reviewerNote || '');
  const [isReviewed, setIsReviewed] = useState(Boolean(submission.reviewedAt || submission.reviewedBy));
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [saveNoteError, setSaveNoteError] = useState<string | null>(null);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);
  const [reviewedAt, setReviewedAt] = useState<string | null>(submission.reviewedAt || null);
  const [isRetrying, setIsRetrying] = useState(false);

  const creatorHandle = parseCreatorHandle(submission.postUrl);
  const postId = parsePostId(submission.postUrl);
  const isFailed = submission.status === 'failed';
  const isAnalyzing = submission.status === 'analyzing' || submission.status === 'validating';
  const isQueued = submission.status === 'queued' || submission.status === 'pending';

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingNote) return;

    setIsSavingNote(true);
    setSaveNoteError(null);

    try {
      const updated = await reviewSubmission(submission.id, {
        reviewerNote: reviewerNote.trim(),
        markReviewed: isReviewed,
      });

      // Update state strictly from server truth
      setReviewerNote(updated.reviewerNote || '');
      setIsReviewed(Boolean(updated.reviewedAt || updated.reviewedBy));
      setReviewedAt(updated.reviewedAt || null);

      setNoteSavedFeedback(true);
      setTimeout(() => setNoteSavedFeedback(false), 4000);
    } catch (err: unknown) {
      setSaveNoteError(
        err instanceof Error ? err.message : 'Failed to save reviewer note.'
      );
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleRetryClick = async () => {
    if (!onRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const riskLevel = analysis?.riskLevel || submission.riskLevel;
  const riskScore = analysis?.riskScore ?? submission.riskScore;
  const riskSummary = analysis?.riskSummary;
  const isPendingAnalysis = isAnalyzing || isQueued || (!analysis && !isFailed);
  const creatorContext = analysis?.creatorContext;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          <span>Back to Submissions Queue</span>
        </Link>
      </div>

      {/* Header Region */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-lg text-slate-700 flex-shrink-0 shadow-inner">
              {creatorHandle.slice(1, 3).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {creatorHandle}
                </h1>
                <a
                  href={submission.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  title="Open original post on X in a new tab"
                >
                  <span>View on X</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                {submission.campaignId && (
                  <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    Campaign: {submission.campaignId.slice(0, 8)}…
                  </span>
                )}
                <span>Submitted on {formatDate(submission.createdAt)}</span>
                <span className="font-mono text-slate-400">ID: {submission.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isReviewed && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <span>Reviewed</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Failure State Banner per DUXS §4.3 */}
      {isFailed && (
        <div className="p-6 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-red-900">Analysis Failed</h3>
              <p className="text-sm text-red-700 mt-1">
                {submission.failureReason || 'Analysis attempted but could not complete due to rate limits or inaccessible post content.'}
              </p>
            </div>
          </div>
          {onRetry && (
            <Button
              variant="secondary"
              onClick={handleRetryClick}
              isLoading={isRetrying}
              className="flex-shrink-0 bg-white"
            >
              Retry Analysis
            </Button>
          )}
        </div>
      )}

      {/* Analyzing / Queued State */}
      {(isAnalyzing || isQueued) && (
        <div className="p-6 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 animate-spin">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-blue-900">
              {isAnalyzing ? 'Analyzing Engagement Signals…' : 'Queued for Analysis'}
            </h3>
            <p className="text-xs text-blue-700 mt-1">
              Detection engines are examining velocity curves, profile integrity, and bot network interaction patterns.
            </p>
          </div>
        </div>
      )}

      {/* Main Analysis Content (Only when not failed) */}
      {!isFailed && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Center 2 Columns: Score Panel & Evidence List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Score Panel */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Overall Risk Assessment
                  </span>
                  <div className="mt-2">
                    <RiskScoreBadge
                      riskLevel={riskLevel}
                      riskScore={riskScore}
                      size="lg"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsExplainerOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium self-start sm:self-center"
                >
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                  </svg>
                  <span>How is this calculated?</span>
                </button>
              </div>

              {/* Plain-Language One-Line Summary */}
              <div>
                {isPendingAnalysis ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                    <div className="h-3.5 w-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin flex-shrink-0" />
                    <span>Analyzing signals…</span>
                  </div>
                ) : riskSummary ? (
                  <p className="text-sm font-medium text-slate-800 leading-relaxed">
                    {riskSummary}
                  </p>
                ) : (
                  <p className="text-xs italic text-slate-400 font-normal">
                    Summary unavailable
                  </p>
                )}
                {analysis?.analysisVersion && (
                  <p className="mt-1 text-[11px] text-slate-400 font-mono">
                    Engine: {analysis.analysisVersion} • Analyzed at {formatDate(analysis.analyzedAt)}
                  </p>
                )}
              </div>
            </div>

            {/* Evidence List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                  Evidence Findings ({analysis?.evidence?.length || 0})
                </h3>
                <span className="text-xs text-slate-400">Ordered by severity</span>
              </div>

              <EvidenceList evidence={analysis?.evidence || []} />
            </div>

            {/* Reviewer Actions Panel per DUXS §4.3 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Reviewer Actions</h3>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={isReviewed}
                    onChange={(e) => setIsReviewed(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-500"
                  />
                  <span>Mark as reviewed</span>
                </label>
              </div>

              {saveNoteError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
                  <span>{saveNoteError}</span>
                  <button
                    type="button"
                    onClick={() => setSaveNoteError(null)}
                    className="text-red-500 hover:text-red-700 font-bold ml-2"
                  >
                    ×
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveNote} className="space-y-3">
                <div>
                  <label htmlFor="reviewer-note" className="block text-xs font-medium text-slate-600 mb-1">
                    Reviewer Notes <span className="text-slate-400 font-normal">(persisted for agency review team)</span>
                  </label>
                  <textarea
                    id="reviewer-note"
                    rows={3}
                    value={reviewerNote}
                    onChange={(e) => setReviewerNote(e.target.value)}
                    placeholder="Add qualitative review notes or reward decision rationale…"
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                  <span className="text-[11px] text-slate-400">
                    {reviewedAt
                      ? `Last reviewed on ${formatDate(reviewedAt)}`
                      : '* Note: Reviewer notes and status are not fed back into scoring in MVP.'}
                  </span>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {noteSavedFeedback && (
                      <span className="text-xs font-medium text-emerald-600 animate-in fade-in">
                        Note saved successfully!
                      </span>
                    )}
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      isLoading={isSavingNote}
                      disabled={isSavingNote}
                    >
                      Save Note
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Context Panels */}
          <div className="space-y-6">
            {/* Post Context Panel */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Post Context
              </h3>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                    𝕏
                  </div>
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {creatorHandle}
                  </span>
                </div>
                <div className="text-xs text-slate-600 font-mono break-all">
                  Post ID: {postId || '—'}
                </div>
                <div className="text-xs text-slate-500 pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span>Source Platform</span>
                  <span className="font-semibold text-slate-700">X (Twitter)</span>
                </div>
                <a
                  href={submission.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2 px-3 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                >
                  Open Original Post ↗
                </a>
              </div>
            </div>

            {/* Creator Context Panel (Campaign Intelligence Layer) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Creator Intelligence
                </h3>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                  Context Only
                </span>
              </div>

              {!creatorContext ? (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center py-6">
                  <p className="text-xs font-medium text-slate-700">Creator information pending</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Creator identity and account metrics are being resolved in the background.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Author Handle</span>
                    <span className="font-semibold text-slate-900">{creatorHandle}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Account Age</span>
                    <span className="font-medium text-slate-800">
                      {creatorContext.accountAgeSummary || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Follower Count</span>
                    <span className="font-semibold text-slate-900">
                      {creatorContext.followerCount !== null && creatorContext.followerCount !== undefined
                        ? creatorContext.followerCount.toLocaleString()
                        : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Prior Submissions</span>
                    <span className="font-medium text-slate-800">
                      {creatorContext.priorSubmissionsCount ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500">Prior Avg Risk Score</span>
                    <span className="font-medium text-slate-800">
                      {creatorContext.priorSubmissionsAvgRiskScore !== null &&
                      creatorContext.priorSubmissionsAvgRiskScore !== undefined
                        ? `${Math.round(creatorContext.priorSubmissionsAvgRiskScore)} / 100`
                        : 'No prior submissions'}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 pt-1 leading-normal">
                Creator history is shown as contextual background for the reviewer, not as a direct score modifier.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Explainer Panel Dialog */}
      <RiskExplainerPanel
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
      />
    </div>
  );
}
