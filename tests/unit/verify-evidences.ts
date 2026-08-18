import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ApiKeysTable } from '../../components/api-keys/ApiKeysTable';
import { ApiKeyListItem } from '../../lib/api-client/api-keys';

const API_BASE_URL = 'http://localhost:3000/v1';
const DEV_PASSWORD = 'DevTest123!';

async function login(email: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: DEV_PASSWORD }),
  });
  const data = await res.json();
  return data.accessToken;
}

async function runEvidenceChecks() {
  console.log('================================================================');
  console.log('ADDITIONAL VERIFICATION EVIDENCE CHECKS');
  console.log('================================================================\n');

  // --- EVIDENCE 1: Muted Strikethrough Styling & Disabled Action on Revoked Row ---
  console.log('--- 1. Rendered HTML of Active Row vs Revoked Row in ApiKeysTable ---');
  
  const sampleKeys: ApiKeyListItem[] = [
    {
      id: 'k1-active',
      name: 'Active Ingest Pipeline Key',
      keyPrefix: 'ci_live_active99',
      scopes: ['submissions:write', 'submissions:read'],
      createdAt: '2026-08-18T08:00:00.000Z',
      lastUsedAt: '2026-08-18T08:30:00.000Z',
      revokedAt: null,
    },
    {
      id: 'k2-revoked',
      name: 'Revoked Legacy Webhook Key',
      keyPrefix: 'ci_live_revok44',
      scopes: ['campaigns:write', 'campaigns:read'],
      createdAt: '2026-08-10T12:00:00.000Z',
      lastUsedAt: null,
      revokedAt: '2026-08-18T09:03:47.830Z',
    },
  ];

  const tableHtml = renderToStaticMarkup(
    React.createElement(ApiKeysTable, {
      keys: sampleKeys,
      onRevokeClick: () => {},
      onCreateClick: () => {},
    })
  );

  console.log('\n[DOM EVIDENCE: REVOKED ROW HTML SNIPPET]:');
  const revokedRowStart = tableHtml.indexOf('<tr class="transition-colors bg-slate-50/60 opacity-60');
  const revokedRowEnd = tableHtml.indexOf('</tr>', revokedRowStart) + 5;
  const revokedRowHtml = tableHtml.slice(revokedRowStart, revokedRowEnd);
  console.log(revokedRowHtml);

  console.log('\n[DOM EVIDENCE: ACTIVE ROW HTML SNIPPET]:');
  const activeRowStart = tableHtml.indexOf('<tr class="transition-colors hover:bg-slate-50/80">');
  const activeRowEnd = tableHtml.indexOf('</tr>', activeRowStart) + 5;
  const activeRowHtml = tableHtml.slice(activeRowStart, activeRowEnd);
  console.log(activeRowHtml);

  // --- EVIDENCE 2: Scope-Checkbox Validation (Zero Scopes Guard) ---
  console.log('\n--- 2. Client & Server Zero-Scope Validation Verification ---');
  
  // 2a. Live Backend Rejection for empty scopes array
  const adminToken = await login('admin@dev-test-agency.local');
  const emptyScopeRes = await fetch(`${API_BASE_URL}/api-keys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Zero Scope Key Attempt',
      scopes: [],
    }),
  });

  const emptyScopeBody = await emptyScopeRes.json();
  console.log('\n[EVIDENCE 2A: POST /v1/api-keys with empty scopes []]:');
  console.log('HTTP Status Code:', emptyScopeRes.status, '(Expected 400)');
  console.log('Response Body:', JSON.stringify(emptyScopeBody, null, 2));

  console.log('\n================================================================');
  console.log('ALL ADDITIONAL EVIDENCE VERIFICATION CHECKS COMPLETED!');
  console.log('================================================================\n');
}

runEvidenceChecks().catch((err) => {
  console.error('Evidence checks failed:', err);
  process.exit(1);
});
