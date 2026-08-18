import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiKeysTable } from '../../components/api-keys/ApiKeysTable';
import { ApiKeyCreateModal } from '../../components/api-keys/ApiKeyCreateModal';
import { ApiKeyRevokeModal } from '../../components/api-keys/ApiKeyRevokeModal';
import { ApiKeysClient } from '../../components/api-keys/ApiKeysClient';
import { ApiKeyListItem, API_KEY_SCOPES } from '../../lib/api-client/api-keys';
import { usePermissions, PermissionsResult } from '../../lib/hooks/usePermissions';

const mockApiKeys: ApiKeyListItem[] = [
  {
    id: 'k1111111-1111-1111-1111-111111111111',
    name: 'Production Ingest Key',
    keyPrefix: 'ci_live_8f2a91',
    scopes: ['submissions:write', 'submissions:read'],
    createdAt: '2026-08-18T01:00:00.000Z',
    lastUsedAt: '2026-08-18T03:45:00.000Z',
    revokedAt: null,
  },
  {
    id: 'k2222222-2222-2222-2222-222222222222',
    name: 'Legacy Analytics Script',
    keyPrefix: 'ci_live_4b7c12',
    scopes: ['analyses:read', 'campaigns:read'],
    createdAt: '2026-08-10T12:00:00.000Z',
    lastUsedAt: null,
    revokedAt: '2026-08-15T09:30:00.000Z',
  },
];

console.log('--- 1. ApiKeysTable Layout & Columns Verification (DUXS §4.6) ---');
const tableHtml = renderToStaticMarkup(
  <ApiKeysTable
    keys={mockApiKeys}
    onRevokeClick={() => {}}
    onCreateClick={() => {}}
  />
);

// Verify Essential Column Headers
if (
  !tableHtml.includes('Key Name &amp; Status') &&
  !tableHtml.includes('Key Name & Status')
) {
  throw new Error('ApiKeysTable missing Key Name header');
}
if (!tableHtml.includes('Key Prefix')) {
  throw new Error('ApiKeysTable missing Key Prefix header');
}
if (!tableHtml.includes('Granted Scopes')) {
  throw new Error('ApiKeysTable missing Granted Scopes header');
}
if (!tableHtml.includes('Last Used')) {
  throw new Error('ApiKeysTable missing Last Used header');
}
if (!tableHtml.includes('Created')) {
  throw new Error('ApiKeysTable missing Created header');
}
if (!tableHtml.includes('Actions')) {
  throw new Error('ApiKeysTable missing Actions header');
}

// Verify Row 1: Active Key
if (!tableHtml.includes('Production Ingest Key')) {
  throw new Error('Missing active key name');
}
if (!tableHtml.includes('ci_live_8f2a91…')) {
  throw new Error('Missing key prefix');
}
if (!tableHtml.includes('submissions:write') || !tableHtml.includes('submissions:read')) {
  throw new Error('Missing scope badges');
}
if (!tableHtml.includes('Active')) {
  throw new Error('Missing Active status badge');
}
if (!tableHtml.includes('Revoke')) {
  throw new Error('Missing Revoke button for active key');
}

// Verify Row 2: Revoked Key
if (!tableHtml.includes('Legacy Analytics Script')) {
  throw new Error('Missing revoked key name');
}
if (!tableHtml.includes('Revoked')) {
  throw new Error('Missing Revoked status badge');
}
if (!tableHtml.includes('Never used')) {
  throw new Error('Missing Never used indicator for null lastUsedAt');
}
if (!tableHtml.includes('No actions')) {
  throw new Error('Revoked key should not show active revoke button');
}
console.log('✓ ApiKeysTable correctly renders columns, active/revoked states, prefixes, and scopes.');

console.log('--- 2. ApiKeysTable Empty State Verification ---');
const emptyTableHtml = renderToStaticMarkup(
  <ApiKeysTable
    keys={[]}
    onRevokeClick={() => {}}
    onCreateClick={() => {}}
  />
);
if (!emptyTableHtml.includes('No API Keys Configured') || !emptyTableHtml.includes('Generate API Key')) {
  throw new Error('ApiKeysTable empty state rendering failed');
}
console.log('✓ ApiKeysTable empty state correctly displays guidance and action button.');

console.log('--- 3. ApiKeyCreateModal Configuration Form Verification (AAD §3.2) ---');
const createModalHtml = renderToStaticMarkup(
  <ApiKeyCreateModal
    isOpen={true}
    isPlatformAdmin={true}
    onClose={() => {}}
    onSuccess={() => {}}
  />
);

// Verify 5 MVP scopes exist
for (const scope of API_KEY_SCOPES) {
  if (!createModalHtml.includes(scope)) {
    throw new Error(`ApiKeyCreateModal missing scope: ${scope}`);
  }
}

// Verify platform admin agency ID input
if (!createModalHtml.includes('Target Agency ID')) {
  throw new Error('ApiKeyCreateModal missing Target Agency ID for platform_admin');
}
console.log('✓ ApiKeyCreateModal includes all 5 MVP scopes and platform_admin agencyId field.');

console.log('--- 4. ApiKeyRevokeModal Verification (DUXS §4.6) ---');
const revokeModalHtml = renderToStaticMarkup(
  <ApiKeyRevokeModal
    isOpen={true}
    apiKey={mockApiKeys[0]}
    isLoading={false}
    onConfirm={() => {}}
    onClose={() => {}}
  />
);
if (
  !revokeModalHtml.includes('Revoke API Key: &quot;Production Ingest Key&quot;') &&
  !revokeModalHtml.includes('Revoke API Key: "Production Ingest Key"')
) {
  throw new Error('ApiKeyRevokeModal title failed');
}
if (!revokeModalHtml.includes('ci_live_8f2a91…')) {
  throw new Error('ApiKeyRevokeModal missing key prefix');
}
if (!revokeModalHtml.includes('Permanent System Deactivation') || !revokeModalHtml.includes('Revoke Key Immediately')) {
  throw new Error('ApiKeyRevokeModal missing destructive confirmation button');
}
console.log('✓ ApiKeyRevokeModal correctly prompts with destructive warning.');

console.log('--- 5. RBAC Access Denial Verification (AAD §5.2) ---');

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

const unauthorizedRoles = ['campaign_manager', 'fraud_reviewer', 'viewer', ''];
for (const role of unauthorizedRoles) {
  const perm = capturePermissions(role);
  if (perm.canManageApiKeys) {
    throw new Error(`Role "${role}" should NOT have canManageApiKeys permission!`);
  }
}

const authorizedRoles = ['platform_admin', 'agency_admin'];
for (const role of authorizedRoles) {
  const perm = capturePermissions(role);
  if (!perm.canManageApiKeys) {
    throw new Error(`Role "${role}" SHOULD have canManageApiKeys permission!`);
  }
}
console.log('✓ RBAC permissions correctly gate API key management strictly to platform_admin & agency_admin.');

console.log('\n========================================');
console.log('ALL API-KEYS FRONTEND UNIT TESTS PASSED!');
console.log('========================================\n');
