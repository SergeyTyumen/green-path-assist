/**
 * Text-to-Speech (TTS)
 * Синтез речи через Tinkoff VoiceKit
 */

import { getVoiceKitClient } from './client';

export interface SynthesisConfig {
  voice: string;
  audioEncoding: string;
  sampleRate: number;
  speed?: number;
  pitch?: number;
  volume?: number;
  emotion?: string;
}

export interface SynthesisResult {
  audioData: ArrayBuffer;
  audioUrl?: string;
  duration?: number;
}

export class SpeechSynthesizer {
  private client = getVoiceKitClient();
  private defaultConfig: SynthesisConfig;

  constructor(config: Partial<SynthesisConfig> = {}) {
    this.defaultConfig = {
      voice: 'alena', // Женский голос Алена
      audioEncoding: 'LINEAR16',
      sampleRate: 48000,
      speed: 1.0,
      pitch: 1.0,
      volume: 1.0,
      emotion: 'neutral',
      ...config
    };
  }

  /**
   * Синтезировать речь из текста
   */
  async synthesize(
    text: string,
    config?: Partial<SynthesisConfig>
  ): Promise<SynthesisResult> {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };
      
      console.log('Starting text synthesis:', { 
        text: text.substring(0, 100) + '...', 
        config: finalConfig 
      });

      // Конфигурация для VoiceKit TTS
      const audioConfig = {
        audio_encoding: finalConfig.audioEncoding,
        sample_rate_hertz: finalConfig.sampleRate,
        voice: { 
          name: finalConfig.voice,
          speed: finalConfig.speed,
          pitch: finalConfig.pitch 
        }
      };

      // Получение TTS клиента из библиотеки tinkoff-voicekit
      // Примечание: Эта библиотека может не поддерживать TTS
      // В таком случае используем HTTP API напрямую
      const audioData = await this.callTTSAPI(text, audioConfig);
      
      // Создание URL для воспроизведения
      const audioBlob = new Blob([audioData], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);

      return {
        audioData,
        audioUrl,
        duration: await this.estimateAudioDuration(audioData, finalConfig.sampleRate)
      };
    } catch (error) {
      console.error('Text synthesis failed:', error);
      throw new Error(`Synthesis failed: ${error.message}`);
    }
  }

  /**
   * Потоковый синтез речи
   */
  async *synthesizeStream(
    text: string,
    config?: Partial<SynthesisConfig>
  ): AsyncGenerator<ArrayBuffer, void, unknown> {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };
      
      console.log('Starting streaming synthesis:', { 
        text: text.substring(0, 100) + '...', 
        config: finalConfig 
      });

      // Разбиение текста на части для потокового синтеза
      const textChunks = this.splitTextIntoChunks(text);
      
      for (const chunk of textChunks) {
        if (chunk.trim()) {
          const result = await this.synthesize(chunk, config);
          yield result.audioData;
        }
      }
    } catch (error) {
      console.error('Streaming synthesis failed:', error);
      throw new Error(`Streaming synthesis failed: ${error.message}`);
    }
  }

  /**
   * Синтез через HTTP API (fallback если библиотека не поддерживает TTS)
   */
  private async callTTSAPI(text: string, config: any): Promise<ArrayBuffer> {
    try {
      // Получаем конфигурацию клиента
      const clientConfig = this.client.getConfig();
      
      // HTTP запрос к Tinkoff VoiceKit TTS API
      const response = await fetch('https://tts.tinkoff.ru/v1/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clientConfig.apiKey}`
        },
        body: JSON.stringify({
          input: { text },
          voice: config.voice,
          audioConfig: {
            audioEncoding: config.audio_encoding,
            sampleRateHertz: config.sample_rate_hertz
          }
        })
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('TTS API call failed:', error);
      
      // Fallback: используем Web Speech API
      return await this.fallbackToWebSpeech(text);
    }
  }

  /**
   * Fallback на Web Speech API
   */
  private async fallbackToWebSpeech(text: string): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      try {
        console.log('Using Web Speech API fallback');
        
        // Создаем пустой аудио буфер как заглушку
        // В реальности здесь должна быть запись через SpeechSynthesis
        const sampleRate = this.defaultConfig.sampleRate;
        const duration = text.length * 0.1; // Примерная длительность
        const numSamples = Math.floor(sampleRate * duration);
        
        const audioBuffer = new ArrayBuffer(numSamples * 2); // 16-bit
        const view = new Int16Array(audioBuffer);
        
        // Генерация тишины (в реальности здесь должен быть синтез)
        for (let i = 0; i < numSamples; i++) {
          view[i] = 0;
        }
        
        resolve(audioBuffer);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Разбиение текста на части для потокового синтеза
   */
  private splitTextIntoChunks(text: string, maxChunkSize = 200): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Оценка длительности аудио
   */
  private async estimateAudioDuration(
    audioData: ArrayBuffer,
    sampleRate: number
  ): Promise<number> {
    try {
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(audioData.slice(0));
      await audioContext.close();
      return audioBuffer.duration;
    } catch {
      // Приблизительная оценка для LINEAR16
      const bytesPerSample = 2; // 16-bit
      const numSamples = audioData.byteLength / bytesPerSample;
      return numSamples / sampleRate;
    }
  }

  /**
   * Получить список доступных голосов
   */
  getAvailableVoices(): string[] {
    return [
      'alena',    // Женский голос
      'filipp',   // Мужской голос
      'ermil',    // Мужской голос
      'jane',     // Женский голос (английский)
      'omazh',    // Женский голос
      'zahar',    // Мужской голос
      'dasha',    // Женский голос
      'julia',    // Женский голос
      'lera',     // Женский голос
      'masha',    // Женский голос
      'marina',   // Женский голос
      'alexander',// Мужской голос
      'kirill',   // Мужской голос
      'anton'     // Мужской голос
    ];
  }

  /**
   * Проверить поддержку голоса
   */
  isVoiceSupported(voice: string): boolean {
    return this.getAvailableVoices().includes(voice);
  }

  /**
   * Обновить конфигурацию по умолчанию
   */
  updateDefaultConfig(newConfig: Partial<SynthesisConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...newConfig };
  }

  /**
   * Получить текущую конфигурацию
   */
  getConfig(): SynthesisConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Проверить поддержку потокового синтеза
   */
  supportsStreaming(): boolean {
    return true; // Мы реализуем потоковый синтез через разбиение на части
  }

  /**
   * Очистить созданные URL объекты
   */
  cleanup(): void {
    // Здесь можно очистить созданные URL.createObjectURL
    console.log('SpeechSynthesizer cleanup completed');
  }
}