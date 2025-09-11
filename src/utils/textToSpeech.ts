import { supabase } from "@/integrations/supabase/client";

export interface TTSOptions {
  text: string;
  provider: 'web_speech' | 'openai' | 'elevenlabs' | 'yandex';
  voice?: string;
  rate?: number;
  pitch?: number;
  apiKey?: string;
}

export class TextToSpeechService {
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async speak(options: TTSOptions): Promise<void> {
    const { text, provider, voice, rate = 1.0, pitch = 1.0, apiKey } = options;

    if (!text.trim()) {
      throw new Error('Text cannot be empty');
    }

    // Остановить предыдущее воспроизведение
    this.stop();

    switch (provider) {
      case 'web_speech':
        await this.speakWithWebSpeech(text, voice, rate, pitch);
        break;
      
      case 'openai':
      case 'elevenlabs':
      case 'yandex':
        await this.speakWithAPI(provider, text, voice, rate, pitch, apiKey);
        break;
      
      default:
        throw new Error(`Unsupported TTS provider: ${provider}`);
    }
  }

  private async speakWithWebSpeech(text: string, voice?: string, rate: number = 1.0, pitch: number = 1.0): Promise<void> {
    if (!('speechSynthesis' in window)) {
      throw new Error('Speech synthesis not supported in this browser');
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Настройка голоса
      if (voice) {
        const voices = speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => 
          v.name.includes(voice) || 
          v.lang.includes('ru') || 
          (voice.includes('female') && v.name.toLowerCase().includes('female')) ||
          (voice.includes('male') && v.name.toLowerCase().includes('male'))
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.rate = Math.max(0.1, Math.min(10, rate));
      utterance.pitch = Math.max(0, Math.min(2, pitch));
      utterance.volume = 1;

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      speechSynthesis.speak(utterance);
    });
  }

  private async speakWithAPI(
    provider: string, 
    text: string, 
    voice?: string, 
    rate?: number, 
    pitch?: number, 
    apiKey?: string
  ): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text,
          provider,
          voice,
          rate,
          pitch,
          apiKey
        }
      });

      if (error) {
        throw new Error(error.message || 'TTS API error');
      }

      if (data.provider === 'web_speech') {
        // Fallback к Web Speech API
        await this.speakWithWebSpeech(data.text, data.voice, data.rate, data.pitch);
        return;
      }

      if (!data.audioContent) {
        throw new Error('No audio content received');
      }

      await this.playAudioFromBase64(data.audioContent);

    } catch (error) {
      console.error('TTS API Error:', error);
      // Fallback к Web Speech API при ошибке
      console.log('Falling back to Web Speech API');
      await this.speakWithWebSpeech(text, voice, rate, pitch);
    }
  }

  private async playAudioFromBase64(base64Audio: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Конвертируем base64 в blob
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(blob);
        
        this.currentAudio = new Audio(audioUrl);
        
        this.currentAudio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        this.currentAudio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };
        
        this.currentAudio.play().catch(reject);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  stop(): void {
    // Остановить Web Speech API
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }

    // Остановить текущее аудио
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  isSpeaking(): boolean {
    return (
      ('speechSynthesis' in window && speechSynthesis.speaking) ||
      (this.currentAudio && !this.currentAudio.paused)
    );
  }

  // Получить доступные голоса для Web Speech API
  getWebSpeechVoices(): SpeechSynthesisVoice[] {
    if (!('speechSynthesis' in window)) {
      return [];
    }
    return speechSynthesis.getVoices();
  }

  // Проверить поддержку провайдера
  static isProviderSupported(provider: string): boolean {
    switch (provider) {
      case 'web_speech':
        return 'speechSynthesis' in window;
      case 'openai':
      case 'elevenlabs':
      case 'yandex':
        return true; // Доступны через API
      default:
        return false;
    }
  }

  // Получить рекомендуемый голос для языка
  static getRecommendedVoice(provider: string, language: string = 'ru'): string {
    switch (provider) {
      case 'openai':
        return language.startsWith('ru') ? 'alloy' : 'alloy';
      case 'elevenlabs':
        return '9BWtsMINqrJLrRacOk9x'; // Aria
      case 'yandex':
        return 'alena';
      case 'web_speech':
        return 'browser-default';
      default:
        return 'alloy';
    }
  }
}

// Создать синглтон экземпляр
export const ttsService = new TextToSpeechService();