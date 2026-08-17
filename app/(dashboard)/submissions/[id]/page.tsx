import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getSubmission, getLatestAnalysis, Submission, AnalysisResponse } from '@/lib/api-client/submissions';
import { SubmissionDetailClient } from '@/components/submissions/SubmissionDetailClient';

interface SubmissionDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Submission Detail Screen per DUXS §4.3 and OAS §5.
 * Core explainability view displaying full Risk Score breakdown backed by Evidence.
 */
export default async function SubmissionDetailPage({ params }: SubmissionDetailPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('ci_access_token')?.value;

  let submission: Submission | null = null;
  let analysis: AnalysisResponse | null = null;
  let errorMsg: string | null = null;

  try {
    submission = await getSubmission(id, token);

    // If submission is completed, fetch its latest analysis findings
    if (submission.status === 'completed') {
      try {
        analysis = await getLatestAnalysis(id, token);
      } catch {
        // Analysis may be pending or failed
      }
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : 'Failed to load submission';
  }

  if (errorMsg || !submission) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-900">Submission Not Found</h2>
        <p className="mt-1 text-sm text-slate-500">
          {errorMsg || `No submission with ID ${id} was found for your agency.`}
        </p>
        <div className="mt-6">
          <Link
            href="/submissions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            ← Back to Submissions Queue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SubmissionDetailClient
      submission={submission}
      analysis={analysis}
    />
  );
}
