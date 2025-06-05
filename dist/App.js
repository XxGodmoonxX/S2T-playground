import React, { useState, useRef } from 'https://esm.sh/react@18';
export default function App() {
    const [transcript, setTranscript] = useState('');
    const wsRef = useRef(null);
    const recorderRef = useRef(null);
    const startRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const ws = new WebSocket('wss://api.openai.com/v1/realtime'); // placeholder
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.text) {
                    setTranscript((prev) => prev + data.text);
                }
            }
            catch (e) {
                console.error('Failed to parse message', e);
            }
        };
        ws.onopen = () => {
            ws.send(JSON.stringify({
                model: 'gpt-4o-transcribe',
                language: 'ja',
            }));
            recorder.start(250);
        };
        recorder.ondataavailable = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(e.data);
            }
        };
        recorderRef.current = recorder;
        wsRef.current = ws;
    };
    const stopRecording = () => {
        var _a, _b;
        (_a = recorderRef.current) === null || _a === void 0 ? void 0 : _a.stop();
        (_b = wsRef.current) === null || _b === void 0 ? void 0 : _b.close();
    };
    return (React.createElement("div", null,
        React.createElement("h1", null, "Realtime Transcription"),
        React.createElement("button", { onClick: startRecording }, "Start"),
        React.createElement("button", { onClick: stopRecording }, "Stop"),
        React.createElement("pre", null, transcript)));
}
