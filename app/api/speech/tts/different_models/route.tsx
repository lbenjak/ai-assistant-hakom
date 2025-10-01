export const runtime = "nodejs";

import { TTSServiceURL } from "@/app/speech-config";

interface DifferentModelsRequest {
    text: string;
    model: string;
}

interface DifferentModelsResponse {
    audioId: string;
}

export async function POST(request) {
    let requestBody: DifferentModelsRequest;

    requestBody = await request.json();

    const { text, model } = requestBody;
    
    const ttsResponse = await fetch(`${TTSServiceURL}/synthesize/${model}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: "include",
        body: JSON.stringify({
            text: text,
            speed_rate: "1.1",
        }),
    });

    if (!ttsResponse.ok) {
        const errorBody = await ttsResponse.json();
        console.error(`TTS service error: ${ttsResponse.status} ${ttsResponse.statusText}`, errorBody);
        return Response.json(
            { error: `TTS service failed with status ${ttsResponse.status}.`, details: errorBody },
            { status: ttsResponse.status }
        );
    }
    const data = await ttsResponse.json();
    console.log("TTS service response:", data);

    const modelsResponse: DifferentModelsResponse = { audioId: data.audio_id };

    return Response.json(modelsResponse);
}
