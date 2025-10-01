async function recognizeSpeech(audioBlob: Blob) {
    try {
        const formData = new FormData();

        formData.append('file', audioBlob, 'audio.webm');

        const response = await fetch('/api/speech/stt/first_model', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            let errorData: { error?: any; message: any; };
            try {
                errorData = await response.json();
            } catch(e) {
                errorData = { message: await response.text() };
            }
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData?.error || errorData?.message || 'Unknown error'}`);
         }

        const data = await response.json();
        //console.log(data.text)
        return data.text;

    } catch (error) {
        console.error('Error during speech synthesis:', error);
    }
}

export default recognizeSpeech;