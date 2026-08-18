import { redirect } from 'next/navigation';

/**
 * Submissions Page redirect to root dashboard per user route configuration.
 */
export default function SubmissionsPage() {
  redirect('/');
}
