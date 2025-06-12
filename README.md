# S2T-playground

This example shows how to implement a minimal React + TypeScript front‑end that
streams microphone audio to OpenAI's Realtime API for GPT‑4o transcription.

## Development

Before building, copy `.env.example` to `.env` and add your API key:
```bash
cp .env.example .env
```
Edit `.env` and fill in `OPENAI_API_KEY`. The `.env` file is gitignored.
The compiled JavaScript will be generated in `dist/`, which is also gitignored.

1. Compile the TypeScript files:
   ```bash
   npx tsc
   ```

2. Start a local server and open `index.html` in your browser:
   ```bash
   python3 -m http.server 8000
   ```
   Then visit <http://localhost:8000>.

The app uses browser APIs to capture audio and send it over a WebSocket to the
Realtime API. Replace the WebSocket URL with your authenticated endpoint.

