"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/app/globals.css";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [googleClientId, setGoogleClientId] = useState("");

  useEffect(() => {
    // Fetch config from API at runtime
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setGoogleClientId(data.googleClientId))
      .catch((err) => console.error("Failed to load config:", err));
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>AIDefCom</title>
        <link rel="icon" href="/favicon-new.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {googleClientId ? (
          <GoogleOAuthProvider clientId={googleClientId}>
            {children}
          </GoogleOAuthProvider>
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
