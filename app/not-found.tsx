import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">404</h1>
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Page not found</h2>
        <p className="text-sm text-slate-500 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/submissions"
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
        >
          Return to Submissions Queue
        </Link>
      </div>
    </div>
  );
}
