import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Morse Bridge | Institutional Stateless Cap Table & Equity Intelligence',
  description: 'Institutional stateless equity management for Pre-Seed, Seed, Series A, and Growth Stage startups. Zero database, URL state management, SAFE simulations, 409A option pricing, and exit waterfalls.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070b13] text-slate-200 antialiased selection:bg-amber-500/20 selection:text-amber-300">
        {children}
      </body>
    </html>
  );
}
