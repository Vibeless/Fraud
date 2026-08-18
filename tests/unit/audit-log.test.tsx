import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuditLogTable } from '../../components/audit/AuditLogTable';
import { AuditLogFilters } from '../../components/audit/AuditLogFilters';
import { AuditLogClient } from '../../components/audit/AuditLogClient';
import { AuditLogEntry } from '../../lib/api-client/audit';
import { usePermissions, PermissionsResult } from '../../lib/hooks/usePermissions';

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    action: 'campaign.created',
    actorType: 'user',
    actorId: '11111111-1111-1111-1111-111111111111',
    resourceType: 'campaign',
    resourceId: 'c3705b37-1111-2222-3333-444444444444',
    ipAddress: '192.168.1.100',
    createdAt: '2026-08-18T02:00:00.000Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    action: 'api_key.revoked',
    actorType: 'api_key',
    actorId: '22222222-2222-2222-2222-222222222222',
    resourceType: 'api_key',
    resourceId: 'k9999999-9999-9999-9999-999999999999',
    ipAddress: '10.0.0.5',
    createdAt: '2026-08-18T02:15:00.000Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    action: 'submission.reviewed',
    actorType: 'user',
    actorId: '33333333-3333-3333-3333-333333333333',
    resourceType: 'submission',
    resourceId: 's8888888-8888-8888-8888-888888888888',
    ipAddress: '127.0.0.1',
    createdAt: '2026-08-18T02:30:00.000Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    action: 'system.cleanup',
    actorType: 'system',
    actorId: null,
    resourceType: null,
    resourceId: null,
    ipAddress: null,
    createdAt: '2026-08-18T03:00:00.000Z',
  },
];

console.log('--- 1. AuditLogTable Read-Only Verification ---');
const tableHtml = renderToStaticMarkup(
  <AuditLogTable
    entries={mockAuditLogs}
    totalCount={4}
    page={1}
    pageSize={25}
    onPageChange={() => {}}
  />
);

console.log('Rendered Table HTML snippet:\n', tableHtml.slice(0, 500));

// Verification: Must contain expected columns and labels
if (!tableHtml.includes('Timestamp') || !tableHtml.includes('Actor') || !tableHtml.includes('Action') || !tableHtml.includes('Resource')) {
  throw new Error('AuditLogTable missing essential headers per DUXS §4.5');
}

// Verification: Actor formatting
if (!tableHtml.includes('User') || !tableHtml.includes('11111111…') || !tableHtml.includes('API Key') || !tableHtml.includes('System')) {
  throw new Error('AuditLogTable actor formatting failed');
}

// Verification: Resource formatting
if (!tableHtml.includes('campaign') || !tableHtml.includes('c3705b37…') || !tableHtml.includes('submission')) {
  throw new Error('AuditLogTable resource formatting failed');
}

// Verification: Action styles and IP addresses
if (!tableHtml.includes('campaign.created') || !tableHtml.includes('api_key.revoked') || !tableHtml.includes('192.168.1.100')) {
  throw new Error('AuditLogTable action or IP rendering failed');
}

// Verification: Strict read-only test - no mutating buttons
const forbiddenMutations = ['delete', 'edit', 'modify', 'remove', 'revoke', 'update', 'save changes', 'create'];
for (const term of forbiddenMutations) {
  const regex = new RegExp(`<button[^>]*>[^<]*${term}[^<]*<\\/button>`, 'i');
  if (regex.test(tableHtml)) {
    throw new Error(`AuditLogTable contains forbidden mutating button: ${term}`);
  }
}
console.log('✓ AuditLogTable is strictly read-only with no mutating action affordances.');

console.log('--- 2. AuditLogFilters Verification ---');
const standardFiltersHtml = renderToStaticMarkup(
  <AuditLogFilters
    filters={{ action: 'campaign.created', actorId: '11111111-1111-1111-1111-111111111111' }}
    isPlatformAdmin={false}
    onChange={() => {}}
    onReset={() => {}}
  />
);

if (!standardFiltersHtml.includes('Action Type') || !standardFiltersHtml.includes('Actor UUID') || !standardFiltersHtml.includes('Date From')) {
  throw new Error('AuditLogFilters missing standard filter fields');
}
if (standardFiltersHtml.includes('Target Agency UUID')) {
  throw new Error('Standard user should not see Target Agency UUID filter');
}

const platformAdminFiltersHtml = renderToStaticMarkup(
  <AuditLogFilters
    filters={{ agencyId: '99999999-9999-9999-9999-999999999999' }}
    isPlatformAdmin={true}
    onChange={() => {}}
    onReset={() => {}}
  />
);

if (!platformAdminFiltersHtml.includes('Target Agency UUID') || !platformAdminFiltersHtml.includes('Platform Admin Scope')) {
  throw new Error('Platform admin filter missing Target Agency UUID scope control');
}
console.log('✓ AuditLogFilters correctly renders filter controls and platform_admin agency scope.');

console.log('--- 3. RBAC Permissions Matrix Verification (AAD §5.2) ---');

function TestPermissionsComponent({ role, onCapture }: { role: string; onCapture: (p: PermissionsResult) => void }) {
  const perms = usePermissions(role);
  onCapture(perms);
  return null;
}

function capturePermissions(role: string): PermissionsResult {
  let captured: PermissionsResult | null = null;
  renderToStaticMarkup(<TestPermissionsComponent role={role} onCapture={(p) => { captured = p; }} />);
  return captured!;
}

const platformAdminPerms = capturePermissions('platform_admin');
const agencyAdminPerms = capturePermissions('agency_admin');
const fraudReviewerPerms = capturePermissions('fraud_reviewer');
const campaignManagerPerms = capturePermissions('campaign_manager');
const viewerPerms = capturePermissions('viewer');

console.log('platform_admin canViewAuditLog:', platformAdminPerms.canViewAuditLog);
console.log('agency_admin canViewAuditLog:', agencyAdminPerms.canViewAuditLog);
console.log('fraud_reviewer canViewAuditLog:', fraudReviewerPerms.canViewAuditLog);
console.log('campaign_manager canViewAuditLog:', campaignManagerPerms.canViewAuditLog);
console.log('viewer canViewAuditLog:', viewerPerms.canViewAuditLog);

if (!platformAdminPerms.canViewAuditLog || !agencyAdminPerms.canViewAuditLog || !fraudReviewerPerms.canViewAuditLog) {
  throw new Error('Authorized roles (platform_admin, agency_admin, fraud_reviewer) failed canViewAuditLog check');
}

if (campaignManagerPerms.canViewAuditLog || viewerPerms.canViewAuditLog) {
  throw new Error('Unauthorized roles (campaign_manager, viewer) unexpectedly passed canViewAuditLog check');
}
console.log('✓ RBAC Permission matrix matches AAD §5.2 perfectly.');

console.log('\n>>> SUCCESS: All Audit Log Component, RBAC, and Filter Tests Passed! <<<');
