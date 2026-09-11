import './globals.css';
import type { Metadata } from 'next';
import { Outfit, Space_Grotesk } from 'next/font/google';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
});

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
    <html lang="en" className={`dark ${outfit.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-[#020817] min-h-screen text-slate-100 flex flex-col antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
