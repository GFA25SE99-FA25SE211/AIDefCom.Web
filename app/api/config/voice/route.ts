import { NextResponse } from "next/server";
import { AI_SERVICE_URL } from "@/lib/config/api-urls";

export async function GET() {
  const voiceApiUrl = process.env.VOICE_API_URL || AI_SERVICE_URL;

  return NextResponse.json({ voiceApiUrl });
}
