declare module 'openai' {
  export default class OpenAI {
    constructor(options: { apiKey: string; dangerouslyAllowBrowser?: boolean });
    
    audio: {
      transcriptions: {
        create(params: { 
          file: File | Blob; 
          model: string;
        }): Promise<{ text: string }>;
      };
    };
  }
}