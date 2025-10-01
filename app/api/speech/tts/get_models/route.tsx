export const runtime = "nodejs";

interface ModelsResponse {
    models: string[];
}

export async function GET() {
    try {
        // Return only VITS-hr model since we're only using the production TTS service
        const modelsResponse: ModelsResponse = { models: ["VITS-hr"] };
        
        console.log("Returning TTS models:", modelsResponse);
        return Response.json(modelsResponse);
    } catch (error) {
        console.error("Error returning TTS models:", error);
        return Response.json({ error: "Failed to return TTS models." }, { status: 500 });
    }
}