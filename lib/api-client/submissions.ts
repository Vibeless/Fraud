'use server';

import { cookies } from 'next/headers';
import { apiClient } from './client';

export type SubmissionStatus =
  | 'pending'
  | 'validating'
  | 'queued'
  | 'analyzing'
  | 'completed'
  | 'failed';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface Submission {
  id: string;
  status: SubmissionStatus;
  postUrl: string;
  campaignId: string | null;
  latestAnalysisId?: string | null;
  reviewerNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  riskScore?: number | null;
  riskLevel?: RiskLevel | string | null;
  failureReason?: string | null;
}

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginatedSubmissionsResponse {
  data: Submission[];
  pagination: Pagination;
}

export interface CreateSubmissionParams {
  postUrl: string;
  campaignId?: string | null;
  externalSubmissionId?: string | null;
}

export interface ReviewSubmissionParams {
  reviewerNote?: string;
  markReviewed?: boolean;
}

export interface ListSubmissionsParams {
  status?: SubmissionStatus | string;
  riskLevel?: RiskLevel | string;
  campaignId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface EvidenceItem {
  category: string;
  severity: string;
  summary: string;
}

export interface CreatorContext {
  accountAgeSummary?: string | null;
  followerCount?: number | null;
  priorSubmissionsCount?: number | null;
  priorSubmissionsAvgRiskScore?: number | null;
}

export interface AnalysisResponse {
  analysisId: string;
  submissionId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  riskSummary?: string | null;
  evidence: EvidenceItem[];
  creatorContext?: CreatorContext | null;
  analysisVersion: string;
  analyzedAt: string;
}

/**
 * Resolves the bearer token from parameter or server cookie store.
 */
async function resolveToken(explicitToken?: string): Promise<string | undefined> {
  if (explicitToken) return explicitToken;
  try {
    const cookieStore = await cookies();
    return cookieStore.get('ci_access_token')?.value;
  } catch {
    return undefined;
  }
}

/**
 * Submits a new X post for fraud and engagement analysis per OAS §5.
 */
export async function createSubmission(
  params: CreateSubmissionParams,
  explicitToken?: string
): Promise<Submission> {
  const token = await resolveToken(explicitToken);
  return apiClient<Submission>('submissions', {
    method: 'POST',
    body: JSON.stringify(params),
    token,
  });
}

/**
 * Retrieves a submission by ID per OAS §5.
 */
export async function getSubmission(
  id: string,
  explicitToken?: string
): Promise<Submission> {
  const token = await resolveToken(explicitToken);
  return apiClient<Submission>(`submissions/${encodeURIComponent(id)}`, {
    method: 'GET',
    token,
  });
}

/**
 * Lists submissions for the caller's agency with optional filters per OAS §6.
 */
export async function listSubmissions(
  params: ListSubmissionsParams = {},
  explicitToken?: string
): Promise<PaginatedSubmissionsResponse> {
  const token = await resolveToken(explicitToken);
  const query = new URLSearchParams();

  if (params.status) query.set('status', params.status);
  if (params.riskLevel) query.set('riskLevel', params.riskLevel);
  if (params.campaignId) query.set('campaignId', params.campaignId);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.pageSize !== undefined) query.set('pageSize', String(params.pageSize));
  if (params.search) query.set('search', params.search);

  const queryString = query.toString();
  const endpoint = queryString ? `submissions?${queryString}` : 'submissions';

  return apiClient<PaginatedSubmissionsResponse>(endpoint, {
    method: 'GET',
    token,
  });
}

/**
 * Submits reviewer notes and reviewed status for a submission per OAS §5.
 */
export async function reviewSubmission(
  id: string,
  params: ReviewSubmissionParams,
  explicitToken?: string
): Promise<Submission> {
  const token = await resolveToken(explicitToken);
  return apiClient<Submission>(`submissions/${encodeURIComponent(id)}/review`, {
    method: 'PATCH',
    body: JSON.stringify(params),
    token,
  });
}

/**
 * Retrieves the latest completed analysis for a submission per OAS §5.
 */
export async function getLatestAnalysis(
  submissionId: string,
  explicitToken?: string
): Promise<AnalysisResponse> {
  const token = await resolveToken(explicitToken);
  return apiClient<AnalysisResponse>(`submissions/${encodeURIComponent(submissionId)}/analysis`, {
    method: 'GET',
    token,
  });
}
