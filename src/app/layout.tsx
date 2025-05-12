import ErrorBoundaryClient from "@/components/ConfirmDialog";
import "@/styles/globals.css";
import React from "react";
import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import AuthProvider from "@/app/providers";
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};
export const metadata: Metadata = {
  title: {
    default: "ABSEN DIGITAL | Absensi Siswa QR Code",
    template: "%s | ABSEN DIGITAL"
  },
  description: "Sistem Absensi Digital yang menghubungkan sekolah dan orang tua secara real-time dengan notifikasi Telegram. Pantau kehadiran siswa dengan mudah menggunakan teknologi QR Code.",
  applicationName: "ABSEN DIGITAL",
  keywords: ["absensi", "qr code", "sekolah", "siswa", "telegram", "notifikasi", "pendidikan", "kehadiran", "absensi digital"],
  authors: [{
    name: "ABSEN DIGITAL Team"
  }],
  creator: "ABSEN DIGITAL Team",
  publisher: "ABSEN DIGITAL Team",
  icons: {
    icon: [{
      url: "/favicon-16x16.png",
      sizes: "16x16",
      type: "image/png"
    }, {
      url: "/favicon-32x32.png",
      sizes: "32x32",
      type: "image/png"
    }, {
      url: "/favicon.ico",
      sizes: "48x48",
      type: "image/x-icon"
    }],
    apple: [{
      url: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png"
    }]
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ABSEN DIGITAL"
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://absendigital.com/",
    title: "ABSEN DIGITAL | Absensi Siswa QR Code",
    description: "Sistem Absensi Digital yang menghubungkan sekolah dan orang tua secara real-time dengan notifikasi Telegram",
    siteName: "ABSEN DIGITAL",
    images: [{
      url: "https://picsum.photos/200",
      width: 1200,
      height: 630,
      alt: "ABSEN DIGITAL QR Code System"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "ABSEN DIGITAL | Absensi Siswa QR Code",
    description: "Sistem Absensi Digital yang menghubungkan sekolah dan orang tua secara real-time dengan notifikasi Telegram",
    images: ["https://picsum.photos/200"]
  }
};
export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <html lang="id" className={`${GeistSans.variable} scroll-smooth`}>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>;
}
