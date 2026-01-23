import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export interface TextQueryRequest {
    question: string;
    language?: string;
}

export interface QueryResponse {
    question: string;
    answer: string;
    language: string;
    sources: Array<{
        content: string;
        metadata: Record<string, any>;
        distance: number;
    }>;
}

export interface VoiceQueryResponse {
    original_text: string;
    english_text: string;
    detected_language: string;
    answer: string;
    sources: Array<{
        content: string;
        metadata: Record<string, any>;
        distance: number;
    }>;
}

export interface Language {
    code: string;
    name: string;
}

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const apiService = {
    async textQuery(question: string, language: string = 'English'): Promise<QueryResponse> {
        const response = await api.post<QueryResponse>('/api/query', {
            question,
            language,
        });
        return response.data;
    },

    async voiceQuery(audioBlob: Blob, language: string = 'auto'): Promise<VoiceQueryResponse> {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        formData.append('language', language);

        const response = await axios.post<VoiceQueryResponse>(
            `${API_BASE_URL}/api/voice-query`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    async getSupportedLanguages(): Promise<Language[]> {
        const response = await api.get<{ languages: Language[] }>('/api/languages');
        return response.data.languages;
    },

    async healthCheck(): Promise<{ status: string }> {
        const response = await api.get<{ status: string }>('/api/health');
        return response.data;
    },
};
