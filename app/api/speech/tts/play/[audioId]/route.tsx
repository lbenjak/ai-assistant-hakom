export const runtime = "nodejs";

import { TTSServiceURL } from "@/app/speech-config";

export async function GET(
  request: Request,
  { params }: { params: { audioId: string } }
) {
  const audioId = params.audioId;

  try {
    const streamURL = `${TTSServiceURL}/stream/${audioId}`;

    const ttsResponse = await fetch(streamURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: "include",
    });

    if (!ttsResponse.ok) {
      const errorBody = await ttsResponse.text();
      return new Response(`TTS stream service failed: ${errorBody}`, { status: ttsResponse.status });
    }

    const audioStream = ttsResponse.body;
    const contentType = ttsResponse.headers.get('Content-Type') || 'audio/mpeg';

    if (!audioStream) {
      console.error(`Failed to get audio stream body from TTS service (${streamURL})`);
      return new Response("Failed to get audio stream from TTS service", { status: 500 });
    }

    // Stream the audio back to the client
    return new Response(audioStream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache', // Good for dynamic content
      },
    });

  } catch (error) {
    console.error(`Error proxying audio stream for audioId ${audioId}:`, error);
    return new Response("Internal server error while fetching audio stream", { status: 500 });
  }
}