import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ThreatSync OS — Defensive Cyber Security Operations Platform',
  description: 'Detect faster. Investigate smarter. Respond confidently. Centralize security alerts, asset visibility, and vulnerability intelligence in one unified SOC dashboard.',
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
