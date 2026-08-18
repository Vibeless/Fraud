export { apiClient, ApiClientError } from './client';
export type { ApiErrorResponse, RequestOptions } from './client';

export {
  createSubmission,
  getSubmission,
  listSubmissions,
  getLatestAnalysis,
  reviewSubmission,
} from './submissions';

export type {
  Submission,
  SubmissionStatus,
  RiskLevel,
  Pagination,
  PaginatedSubmissionsResponse,
  CreateSubmissionParams,
  ReviewSubmissionParams,
  ListSubmissionsParams,
  EvidenceItem,
  CreatorContext,
  AnalysisResponse,
} from './submissions';

export {
  createCampaign,
  listCampaigns,
  getCampaign,
  activateCampaign,
  closeCampaign,
  reopenCampaign,
  analyzeCampaign,
} from './campaigns';

export type {
  Campaign,
  CampaignStatus,
  PaginatedCampaignsResponse,
  CreateCampaignParams,
  ListCampaignsParams,
  CampaignAnalysisResult,
} from './campaigns';

export {
  listAuditLogs,
} from './audit';

export type {
  AuditActorType,
  AuditLogEntry,
  ListAuditLogsResponse,
  ListAuditLogsParams,
} from './audit';

