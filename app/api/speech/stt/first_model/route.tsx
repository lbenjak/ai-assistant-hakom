import { openai } from "@/app/openai";

export const runtime = "nodejs";

export async function POST(request) {
    const formData = await request.formData();

    const file = formData.get('file');

    let transcription = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: file,
        language: "hr",        
    });

    console.log(transcription)

    return Response.json({text:transcription.text });
}