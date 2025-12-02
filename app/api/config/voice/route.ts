import { NextResponse } from "next/server";

const DEFAULT_VOICE_API_URL =
  "https://fastapi-service.happyforest-7c6ec975.southeastasia.azurecontainerapps.io";

export async function GET() {
  const voiceApiUrl = process.env.VOICE_API_URL || DEFAULT_VOICE_API_URL;

  return NextResponse.json({ voiceApiUrl });
}