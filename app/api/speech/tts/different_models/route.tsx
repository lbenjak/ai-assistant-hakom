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

    try {
        requestBody = await request.json();
    } catch (error) {
        console.error("Failed to parse request body", error);
        return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { text, model } = requestBody;
    
    const requestPayload = {
        text: text,
        speed_rate: "1.1",
    };
    
    const ttsResponse = await fetch(`${TTSServiceURL}/synthesize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: "include",
        body: JSON.stringify(requestPayload),
    });

    if (!ttsResponse.ok) {
        let errorBody;
        try {
            errorBody = await ttsResponse.json();
        } catch (e) {
            errorBody = await ttsResponse.text();
        }
        console.error(`TTS service error: ${ttsResponse.status} ${ttsResponse.statusText}`, errorBody);
        return Response.json(
            { error: `TTS service failed with status ${ttsResponse.status}.`, details: errorBody },
            { status: ttsResponse.status }
        );
    }

    const audioId = await ttsResponse.text();

    const modelsResponse: DifferentModelsResponse = { audioId: audioId };

    return Response.json(modelsResponse);
}
