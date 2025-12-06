"use client";

export default function VoiceGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  // Voice check removed - always allow access
  return <>{children}</>;
}
