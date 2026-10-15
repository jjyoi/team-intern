import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const interSans = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});


export const metadata: Metadata = {
  metadataBase: new URL('https://scotiapath-onboarding-hub.vyra6.chatgpt.site'),
  title: 'ScotiaOn',
  description: 'A guided onboarding and offboarding workspace for people managers.',
  openGraph: {
    title: 'ScotiaOn',
    description: 'Every new hire, ready from day one.',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'ScotiaOn onboarding workspace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ScotiaOn',
    description: 'Every new hire, ready from day one.',
    images: ['/og.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={interSans.variable}>
      <body
        className="font-sans antialiased"
      >
        {children}
      </body>
    </html>
  );
}
