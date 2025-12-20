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

    // Suppress expected errors (403, 404) from being logged by Next.js
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const isExpectedError =
        error?.isExpectedError ||
        error?.name === "SilentError" ||
        error?.status === 403 ||
        error?.status === 404 ||
        error?.message?.includes("Access forbidden") ||
        error?.message?.includes("Item not found");

      if (isExpectedError) {
        // Prevent Next.js from logging expected errors
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>AIDefCom</title>
        <link rel="icon" href="/favicon-new.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <GoogleOAuthProvider clientId={googleClientId}>
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
