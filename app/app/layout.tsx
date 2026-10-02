import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://scotiapath-onboarding-hub.vyra6.chatgpt.site'),
  title: 'ScotiaPath — People Operations',
  description: 'A guided onboarding and offboarding workspace for people managers.',
  openGraph: {
    title: 'ScotiaPath — People Operations',
    description: 'Every new hire, ready from day one.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'ScotiaPath onboarding workspace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ScotiaPath — People Operations',
    description: 'Every new hire, ready from day one.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
