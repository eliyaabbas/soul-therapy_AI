import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/Providers'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'SoulTherapy — جامع السعادات',
  description: 'A guided journey through the 4 cycles of soul purification based on Jami al-Sa\'adat by Al-Naraqi.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SoulTherapy',
  },
  openGraph: {
    title: 'SoulTherapy — The Collector of Felicities',
    description: 'Guided tazkiyah through Musharatah, Muraqabah, Muhasabah & Mu\'atabah',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#070709',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
