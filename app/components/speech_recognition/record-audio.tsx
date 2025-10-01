import { useEffect, useRef, useState } from "react";
import styles from "./speech-recognition.module.css"
import recognizeSpeech from "./recognize-speech";
import { ClipLoader } from "react-spinners";

interface RecordAudioProps {
    onRecognize: (text: string) => void;
}

const RecordAudio = ({ onRecognize }: RecordAudioProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDarkTheme, setIsDarkTheme] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsDarkTheme(document.body.classList.contains('dark-theme'));

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        setIsDarkTheme(document.body.classList.contains('dark-theme'));
                    }
                });
            });

            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['class']
            });

            return () => observer.disconnect();
        }
    }, []);

    // Initiate Media Stream and Recorder
    useEffect(() => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices
                .getUserMedia(
                    {
                        audio: true,
                    },
                )
                .then((stream) => {
                    const mediaRecorder = new MediaRecorder(stream);
                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            chunksRef.current.push(event.data);
                        }
                    };
                    mediaRecorderRef.current = mediaRecorder;
                })
                .catch((err) => {
                    console.error(`The following getUserMedia error occurred: ${err}`);
                });
        } else {
            console.log("getUserMedia not supported on your browser!");
        }
    }, [])

    const handleRecordClick = () => {
        if (!isPlaying) {
            if (mediaRecorderRef.current) {
                setIsPlaying(true);
                chunksRef.current = [];
                mediaRecorderRef.current.start();
            } else {
                console.error("MediaRecorder is not initialized.");
            }
        } else {
            if (mediaRecorderRef.current) {
                setIsPlaying(false);
                console.log("Stopping recording...");

                mediaRecorderRef.current.stop();

                mediaRecorderRef.current.onstop = async () => {
                    setIsLoading(true);
                    console.log("Sending audio data...");
                    const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

                    try {
                        const recognizedText = await recognizeSpeech(audioBlob);
                        setIsLoading(false);
                        console.log("Recognized text:", recognizedText);
                        onRecognize(recognizedText); // Pass the recognized text to the parent
                    } catch (error) {
                        console.error("Error recognizing speech:", error);
                    }
                };
            } else {
                console.error("MediaRecorder is not initialized.");
            }
        }
    };

    return <>
        {isLoading ? (
            <div className={styles.loaderContainer}>
                <ClipLoader  loading={isLoading} size={30} />
            </div>
        ) : (
            <img
                className={`${styles.recordIcon} ${isPlaying ? styles.recording : ''}`}
                src={`/microphone-icon${isDarkTheme ? '-dark' : ''}.svg`}
                alt="Snimanje glasa"
                onClick={handleRecordClick}
            />
        )}
    </>
};

export default RecordAudio;