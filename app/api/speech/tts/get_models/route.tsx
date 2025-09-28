export const runtime = "nodejs";

import { localTTSURL } from "@/app/speech-config";

interface ModelsResponse {
    models: string[];
}

export async function GET() {
    try {
        const response = await fetch(`${localTTSURL}/models`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error(`Error fetching models: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Fetched TTS models:", data);
        const modelsResponse: ModelsResponse = { models: data.models };
        modelsResponse.models.push("VITS-hr");

        return Response.json(modelsResponse);
    } catch (error) {
        console.error("Error fetching TTS models:", error);
        return Response.json({ error: "Failed to fetch TTS models." }, { status: 500 });
    }
}