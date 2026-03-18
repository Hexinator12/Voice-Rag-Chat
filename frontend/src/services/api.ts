import axios from 'axios';

// Use environment variable for API URL, fallback to localhost
// Remove trailing slash if present to avoid double slashes
const getApiUrl = () => {
    let url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    console.log('🔗 API Base URL:', url); // Debug log
    return url;
};

export const API_BASE_URL = getApiUrl();

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

export interface StreamQueryHandlers {
    onMeta?: (payload: any) => void;
    onDelta?: (text: string) => void;
    onSentence?: (text: string) => void;
    onDone?: (payload: QueryResponse) => void;
    onError?: (message: string) => void;
}

const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 90000);
const RETRY_DELAY_MS = 2500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error: any): boolean => {
    const status = error?.response?.status;
    const code = error?.code;
    return status === 502 || status === 503 || status === 504 || code === 'ECONNABORTED' || code === 'ERR_NETWORK';
};

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: REQUEST_TIMEOUT_MS,
});

// Add response interceptor for better error diagnosis
api.interceptors.response.use(
    response => response,
    error => {
        console.error('❌ API Error:', {
            url: error.config?.url,
            status: error.response?.status,
            message: error.message
        });
        return Promise.reject(error);
    }
);

export const apiService = {
    async textQuery(question: string, language: string = 'English'): Promise<QueryResponse> {
        try {
            const response = await api.post<QueryResponse>('/api/query', {
                question,
                language,
            });
            return response.data;
        } catch (error: any) {
            if (!isRetryableError(error)) {
                throw error;
            }

            // One retry helps during Render cold-start or transient gateway restarts.
            await sleep(RETRY_DELAY_MS);
            const retryResponse = await api.post<QueryResponse>('/api/query', {
                question,
                language,
            });
            return retryResponse.data;
        }
    },

    async voiceQuery(audioBlob: Blob, language: string = 'auto'): Promise<VoiceQueryResponse> {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        formData.append('language', language);

        try {
            const response = await axios.post<VoiceQueryResponse>(
                `${API_BASE_URL}/api/voice-query`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    timeout: REQUEST_TIMEOUT_MS,
                }
            );
            return response.data;
        } catch (error: any) {
            if (!isRetryableError(error)) {
                throw error;
            }

            await sleep(RETRY_DELAY_MS);
            const retryResponse = await axios.post<VoiceQueryResponse>(
                `${API_BASE_URL}/api/voice-query`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    timeout: REQUEST_TIMEOUT_MS,
                }
            );
            return retryResponse.data;
        }
    },

    async getSupportedLanguages(): Promise<Language[]> {
        const response = await api.get<{ languages: Language[] }>('/api/languages');
        return response.data.languages;
    },

    async healthCheck(): Promise<{ status: string }> {
        const response = await api.get<{ status: string }>('/api/health');
        return response.data;
    },

    async textQueryStream(
        question: string,
        language: string = 'English',
        handlers?: StreamQueryHandlers
    ): Promise<QueryResponse> {
        const response = await fetch(`${API_BASE_URL}/api/query-stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question, language }),
        });

        if (!response.ok || !response.body) {
            throw new Error(`Streaming request failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        let finalResult: QueryResponse | null = null;

        const dispatchEvent = (eventType: string, dataString: string) => {
            let payload: any = {};
            try {
                payload = dataString ? JSON.parse(dataString) : {};
            } catch {
                payload = { text: dataString };
            }

            switch (eventType) {
                case 'meta':
                    handlers?.onMeta?.(payload);
                    break;
                case 'delta':
                    handlers?.onDelta?.(payload.text || '');
                    break;
                case 'sentence':
                    handlers?.onSentence?.(payload.text || '');
                    break;
                case 'done':
                    finalResult = {
                        question,
                        answer: payload.answer || '',
                        language: payload.language || language,
                        sources: payload.sources || [],
                    };
                    handlers?.onDone?.(finalResult);
                    break;
                case 'error':
                    handlers?.onError?.(payload.message || 'Streaming error');
                    break;
                default:
                    break;
            }
        };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';

            for (const eventBlock of events) {
                if (!eventBlock.trim()) continue;

                const lines = eventBlock.split('\n');
                let eventType = 'message';
                const dataLines: string[] = [];

                for (const line of lines) {
                    if (line.startsWith('event:')) {
                        eventType = line.slice(6).trim();
                    } else if (line.startsWith('data:')) {
                        dataLines.push(line.slice(5).trim());
                    }
                }

                dispatchEvent(eventType, dataLines.join('\n'));
            }
        }

        if (finalResult) {
            return finalResult;
        }

        throw new Error('Streaming completed without final result');
    },
};
