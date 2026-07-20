import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = {
  title: 'ND Riot',
  description: 'Independent comics discovery. Support indie comics.',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-neutral-100 antialiased">{children}</body>
    </html>
  )
}
