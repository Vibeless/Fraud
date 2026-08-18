import { cookies } from 'next/headers';
import { listAuditLogs, ListAuditLogsResponse } from '@/lib/api-client/audit';
import { AuditLogClient } from '@/components/audit/AuditLogClient';

/**
 * Audit Log Page per DUXS §4.5 and FFS §2.
 * Server component fetching initial audit log data to avoid client loading flash (FFS §5).
 * Read-only view of immutable security and operational audit trail (FR-010).
 */
export default async function AuditLogPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ci_access_token')?.value;

  let initialData: ListAuditLogsResponse | null = null;

  if (token) {
    try {
      initialData = await listAuditLogs({ page: 1, pageSize: 25 }, token);
    } catch {
      // Fallback to client-side loading if SSR fetch fails or role requires agency selection
      initialData = null;
    }
  }

  return <AuditLogClient initialData={initialData} />;
}
