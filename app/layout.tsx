import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Campaign Integrity — Dashboard',
  description: 'Explainable Risk Scoring and Evidence for Web3 Marketing Campaigns',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased font-sans">{children}</body>
    </html>
  );
}
