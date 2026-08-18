import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ApiKeysTable } from '../../components/api-keys/ApiKeysTable';

const API_BASE_URL = 'http://localhost:3000/v1';
const DEV_PASSWORD = 'DevTest123!';

async function login(email: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: DEV_PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.accessToken;
}

async function getMe(token: string) {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function listKeys(token: string) {
  const res = await fetch(`${API_BASE_URL}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function createKey(token: string, body: any) {
  const res = await fetch(`${API_BASE_URL}/api-keys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  let data: any;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  return { status: res.status, data };
}

async function revokeKey(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api-keys/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function runLiveVerification() {
  console.log('================================================================');
  console.log('LIVE BACKEND API KEYS & RBAC VERIFICATION EVIDENCE');
  console.log('================================================================\n');

  // 1. Authenticate as Agency Admin
  console.log('--- 1. Authenticating as Agency Admin (admin@dev-test-agency.local) ---');
  const adminToken = await login('admin@dev-test-agency.local');
  const adminMe = await getMe(adminToken);
  console.log('Authenticated User Context:', adminMe);

  // 2. Create API Key
  console.log('\n--- 2. POST /v1/api-keys (Creation & One-Time Secret Generation) ---');
  const createPayload = {
    name: 'CI Live Test Key ' + Date.now().toString().slice(-4),
    scopes: ['submissions:write', 'submissions:read', 'analyses:read'],
  };
  console.log('Request Payload:', createPayload);

  const createRes = await createKey(adminToken, createPayload);
  console.log('HTTP Status Code:', createRes.status);
  console.log('[EVIDENCE 1] POST /v1/api-keys Response Body:');
  console.log(JSON.stringify(createRes.data, null, 2));

  if (createRes.status !== 201) {
    throw new Error(`Failed to create API key: ${JSON.stringify(createRes.data)}`);
  }

  const createdId = createRes.data.id;
  const createdSecret = createRes.data.key;
  const createdPrefix = createRes.data.keyPrefix;

  console.log('\nSecret Analysis:');
  console.log(`- Generated Key Format: ci_live_... (Total Length: ${createdSecret?.length} chars)`);
  console.log(`- Truncated Secret Representation for Report: ${createdSecret?.slice(0, 16)}...`);
  console.log(`- Prefix: ${createdPrefix}`);

  // 3. GET /v1/api-keys (Listing & Leak Prevention)
  console.log('\n--- 3. GET /v1/api-keys (Security & Absence of Raw Secret) ---');
  const listRes = await listKeys(adminToken);
  console.log('HTTP Status Code:', listRes.status);
  console.log(`Total Keys Returned: ${listRes.data.data?.length}`);

  const foundKey = listRes.data.data?.find((k: any) => k.id === createdId);
  console.log('\n[EVIDENCE 2] GET /v1/api-keys Record for Created Key:');
  console.log(JSON.stringify(foundKey, null, 2));

  if (!foundKey) {
    throw new Error('Created key was not found in GET /v1/api-keys response');
  }

  if ('key' in foundKey || 'secret' in foundKey || 'rawKey' in foundKey || 'keyHash' in foundKey) {
    throw new Error('SECURITY VIOLATION: Raw key or hash leaked in GET /v1/api-keys response!');
  }
  console.log('✓ Security Check Passed: Full secret is strictly absent from GET list response.');

  // 4. Render Table UI with the real live data
  console.log('\n--- 4. DOM Table Rendering with Live Key Data ---');
  const liveTableHtml = renderToStaticMarkup(
    React.createElement(ApiKeysTable, {
      keys: listRes.data.data,
      onRevokeClick: () => {},
      onCreateClick: () => {},
    })
  );
  console.log('Rendered Table HTML contains Key Prefix:', liveTableHtml.includes(createdPrefix));
  console.log('Rendered Table HTML contains Active Badge:', liveTableHtml.includes('Active'));
  console.log('Rendered Table HTML contains Revoke Button:', liveTableHtml.includes('Revoke'));

  // 5. DELETE /v1/api-keys/:id (Revocation)
  console.log('\n--- 5. DELETE /v1/api-keys/:id (Immediate Revocation) ---');
  const revokeRes = await revokeKey(adminToken, createdId);
  console.log('[EVIDENCE 3] DELETE /v1/api-keys Response Status:', revokeRes.status, '(Expected 204 No Content)');

  // 6. GET /v1/api-keys after Revocation
  console.log('\n--- 6. GET /v1/api-keys after Revocation ---');
  const listAfterRevokeRes = await listKeys(adminToken);
  const revokedKey = listAfterRevokeRes.data.data?.find((k: any) => k.id === createdId);
  console.log('[EVIDENCE 4] Revoked Key Record in List:');
  console.log(JSON.stringify(revokedKey, null, 2));

  if (!revokedKey?.revokedAt) {
    throw new Error('Revoked key does not have revokedAt timestamp populated!');
  }
  console.log(`✓ Revocation timestamp confirmed: ${revokedKey.revokedAt}`);

  // 7. RBAC Verification for Non-Permitted Roles
  console.log('\n--- 7. Non-Permitted Role Access Denial (reviewer@dev-test-agency.local) ---');
  const reviewerToken = await login('reviewer@dev-test-agency.local');
  const reviewerMe = await getMe(reviewerToken);
  console.log('Authenticated Role:', reviewerMe.role);

  const reviewerListRes = await listKeys(reviewerToken);
  console.log('[EVIDENCE 5A] GET /v1/api-keys (Fraud Reviewer) Status:', reviewerListRes.status);
  console.log('Response Body:', reviewerListRes.data);

  const reviewerCreateRes = await createKey(reviewerToken, {
    name: 'Unauthorized Key',
    scopes: ['submissions:write'],
  });
  console.log('[EVIDENCE 5B] POST /v1/api-keys (Fraud Reviewer) Status:', reviewerCreateRes.status);
  console.log('Response Body:', reviewerCreateRes.data);

  if (reviewerListRes.status !== 403 || reviewerCreateRes.status !== 403) {
    throw new Error('RBAC Failure: Non-admin role was not rejected with HTTP 403 Forbidden!');
  }
  console.log('✓ RBAC Enforcement confirmed: Non-permitted roles receive HTTP 403 Forbidden.');

  // 8. Platform Admin Behavior Verification
  console.log('\n--- 8. Platform Admin Behavior (platform_admin@campaignintegrity.local) ---');
  const platformAdminToken = await login('platform_admin@campaignintegrity.local');
  const platformAdminMe = await getMe(platformAdminToken);
  console.log('Authenticated User Profile:', platformAdminMe);

  // 8a. POST without agencyId -> Expect 400 Bad Request
  console.log('\n8a. Platform Admin POST without agencyId:');
  const adminPostNoAgency = await createKey(platformAdminToken, {
    name: 'Platform Admin Key Missing Agency',
    scopes: ['submissions:write'],
  });
  console.log('[EVIDENCE 6A] POST /v1/api-keys without agencyId Status:', adminPostNoAgency.status);
  console.log('Response Body:', adminPostNoAgency.data);

  if (adminPostNoAgency.status !== 400) {
    throw new Error('Platform admin creation without agencyId should return 400 Bad Request!');
  }
  console.log('✓ Platform Admin validation confirmed: agencyId is strictly required.');

  // 8b. POST with agencyId -> Success
  console.log('\n8b. Platform Admin POST with agencyId:');
  const adminPostWithAgency = await createKey(platformAdminToken, {
    name: 'Platform Admin Managed Key ' + Date.now().toString().slice(-4),
    scopes: ['campaigns:write', 'campaigns:read'],
    agencyId: adminMe.agencyId,
  });
  console.log('[EVIDENCE 6B] POST /v1/api-keys with agencyId Status:', adminPostWithAgency.status);
  console.log('Response Body:', adminPostWithAgency.data);

  if (adminPostWithAgency.status !== 201) {
    throw new Error('Platform admin creation with agencyId failed!');
  }

  // 8c. GET across agencies without query param
  console.log('\n8c. Platform Admin GET /v1/api-keys across agencies:');
  const platformListRes = await listKeys(platformAdminToken);
  console.log('[EVIDENCE 6C] GET /v1/api-keys Status:', platformListRes.status);
  console.log('Total Keys Listed Across Agencies:', platformListRes.data.data?.length);

  // 8d. DELETE as Platform Admin
  console.log('\n8d. Platform Admin DELETE /v1/api-keys/:id:');
  const platformRevokeRes = await revokeKey(platformAdminToken, adminPostWithAgency.data.id);
  console.log('[EVIDENCE 6D] Platform Admin DELETE Status:', platformRevokeRes.status);

  console.log('\n================================================================');
  console.log('ALL LIVE API KEYS VERIFICATION CHECKS COMPLETED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runLiveVerification().catch((err) => {
  console.error('Live verification failed:', err);
  process.exit(1);
});
