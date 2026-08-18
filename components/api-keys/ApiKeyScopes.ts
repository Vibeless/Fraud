import { ApiKeyScope } from '@/lib/api-client/api-keys';

export interface ScopeMetadata {
  scope: ApiKeyScope;
  label: string;
  description: string;
  category: 'submissions' | 'analyses' | 'campaigns';
}

export const SCOPES_METADATA: Record<ApiKeyScope, ScopeMetadata> = {
  'submissions:write': {
    scope: 'submissions:write',
    label: 'submissions:write',
    description: 'Submit posts and content items for integrity analysis and fraud scoring',
    category: 'submissions',
  },
  'submissions:read': {
    scope: 'submissions:read',
    label: 'submissions:read',
    description: 'Query submission status, evidence findings, and integrity results',
    category: 'submissions',
  },
  'analyses:read': {
    scope: 'analyses:read',
    label: 'analyses:read',
    description: 'Access detailed risk breakdowns, rule detections, and aggregate reports',
    category: 'analyses',
  },
  'campaigns:write': {
    scope: 'campaigns:write',
    label: 'campaigns:write',
    description: 'Create, update, activate, close, or reopen campaign entities',
    category: 'campaigns',
  },
  'campaigns:read': {
    scope: 'campaigns:read',
    label: 'campaigns:read',
    description: 'Retrieve campaigns, configuration, and aggregate campaign statistics',
    category: 'campaigns',
  },
};
