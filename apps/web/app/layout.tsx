import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ThreatSync OS — Security Operations & Investigation Platform',
  description: 'Full-stack SOC platform for security event ingestion, deterministic detection, alert correlation, explainable risk scoring, incident investigation, and auditable response.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#030712] min-h-screen text-slate-100 flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
