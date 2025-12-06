import { NextResponse } from "next/server";

const DEFAULT_VOICE_API_URL =
  "https://ai-service.thankfultree-4b6bfec6.southeastasia.azurecontainerapps.io";

export async function GET() {
  const voiceApiUrl = process.env.VOICE_API_URL || DEFAULT_VOICE_API_URL;

  return NextResponse.json({ voiceApiUrl });
}
