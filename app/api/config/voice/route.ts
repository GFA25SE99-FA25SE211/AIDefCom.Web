import { NextResponse } from "next/server";

export async function GET() {
  const voiceApiUrl = process.env.VOICE_API_URL;

  if (!voiceApiUrl) {
    return NextResponse.json(
      { error: "VOICE_API_URL is not configured" },
      { status: 500 }
    );
  }

  return NextResponse.json({ voiceApiUrl });
}
