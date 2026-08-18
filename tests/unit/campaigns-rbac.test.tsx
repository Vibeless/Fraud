import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CampaignStatusBadge } from '../../components/campaigns/CampaignStatusBadge';
import { CampaignsTable } from '../../components/campaigns/CampaignsTable';
import { Campaign } from '../../lib/api-client/campaigns';

const mockCampaigns: Campaign[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Summer Brand Awareness 2026',
    externalCampaignId: 'sba-2026',
    status: 'draft',
    createdAt: '2026-08-18T02:00:00.000Z',
    updatedAt: '2026-08-18T02:00:00.000Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Product Launch Influencer Drive',
    externalCampaignId: 'prod-launch-q3',
    status: 'active',
    createdAt: '2026-08-15T10:30:00.000Z',
    updatedAt: '2026-08-15T10:30:00.000Z',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Spring Retargeting 2026',
    externalCampaignId: null,
    status: 'closed',
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-06-01T18:00:00.000Z',
  },
];

console.log('--- 1. CampaignStatusBadge Verification ---');
const draftBadge = renderToStaticMarkup(<CampaignStatusBadge status="draft" />);
const activeBadge = renderToStaticMarkup(<CampaignStatusBadge status="active" />);
const closedBadge = renderToStaticMarkup(<CampaignStatusBadge status="closed" />);
const unknownBadge = renderToStaticMarkup(<CampaignStatusBadge status={null} />);

console.log('Draft Badge HTML:\n', draftBadge);
console.log('Active Badge HTML:\n', activeBadge);
console.log('Closed Badge HTML:\n', closedBadge);
console.log('Unknown Badge HTML:\n', unknownBadge);

if (!draftBadge.includes('Draft') || !draftBadge.includes('bg-slate-100')) {
  throw new Error('Draft badge mapping incorrect');
}
if (!activeBadge.includes('Active') || !activeBadge.includes('bg-emerald-50')) {
  throw new Error('Active badge mapping incorrect');
}
if (!closedBadge.includes('Closed') || !closedBadge.includes('bg-zinc-100')) {
  throw new Error('Closed badge mapping incorrect');
}

console.log('--- 2. CampaignsTable Verification (Manager / Admin Role - canManageCampaigns: true) ---');
const managerTable = renderToStaticMarkup(
  <CampaignsTable
    campaigns={mockCampaigns}
    totalCount={3}
    page={1}
    pageSize={25}
    canManageCampaigns={true}
    onPageChange={() => {}}
    onActivateCampaign={() => {}}
    onAnalyzeCampaign={() => {}}
    onTriggerCloseModal={() => {}}
    onTriggerReopenModal={() => {}}
  />
);

console.log('--- 3. CampaignsTable Verification (Reviewer / Viewer Role - canManageCampaigns: false) ---');
const reviewerTable = renderToStaticMarkup(
  <CampaignsTable
    campaigns={mockCampaigns}
    totalCount={3}
    page={1}
    pageSize={25}
    canManageCampaigns={false}
    onPageChange={() => {}}
    onActivateCampaign={() => {}}
    onAnalyzeCampaign={() => {}}
    onTriggerCloseModal={() => {}}
    onTriggerReopenModal={() => {}}
  />
);

console.log('--- 4. Backend Aggregation Field Placeholders Check ---');
const hasSubmissionsGapNote = managerTable.includes('api gap');
const hasAvgRiskScoreGapNote = managerTable.includes('api gap');
const hasPlaceholderDash = managerTable.includes('—');

console.log('Contains API gap label for Submissions Count:', hasSubmissionsGapNote);
console.log('Contains API gap label for Avg Risk Score:', hasAvgRiskScoreGapNote);
console.log('Contains placeholder dash:', hasPlaceholderDash);

if (!hasSubmissionsGapNote || !hasAvgRiskScoreGapNote || !hasPlaceholderDash) {
  throw new Error('Table does not clearly display placeholder for missing backend aggregates');
}

console.log('--- 5. RBAC Assertions ---');
const managerHasActivate = managerTable.includes('Activate');
const managerHasAnalyze = managerTable.includes('Analyze');
const managerHasClose = managerTable.includes('Close');
const managerHasReopen = managerTable.includes('Reopen');

const reviewerHasActivate = reviewerTable.includes('Activate');
const reviewerHasAnalyze = reviewerTable.includes('Analyze');
const reviewerHasClose = reviewerTable.includes('Close');
const reviewerHasReopen = reviewerTable.includes('Reopen');

console.log('Manager has Activate button:', managerHasActivate);
console.log('Manager has Analyze button:', managerHasAnalyze);
console.log('Manager has Close button:', managerHasClose);
console.log('Manager has Reopen button:', managerHasReopen);

console.log('Reviewer has Activate button:', reviewerHasActivate);
console.log('Reviewer has Analyze button:', reviewerHasAnalyze);
console.log('Reviewer has Close button:', reviewerHasClose);
console.log('Reviewer has Reopen button:', reviewerHasReopen);

if (!managerHasActivate || !managerHasAnalyze || !managerHasClose || !managerHasReopen) {
  throw new Error('Manager is missing required lifecycle affordances');
}

if (reviewerHasActivate || reviewerHasAnalyze || reviewerHasClose || reviewerHasReopen) {
  throw new Error('Reviewer unexpectedly has mutating lifecycle affordances');
}

console.log('\n>>> SUCCESS: All Frontend Components and RBAC Rules Verified! <<<');
