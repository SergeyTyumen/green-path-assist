/**
 * Speech Recognition (STT)
 * Распознавание речи через Tinkoff VoiceKit
 */

import { getVoiceKitClient, AudioConfig } from './client';

export interface RecognitionConfig extends AudioConfig {
  language?: string;
  model?: string;
  enableWordTimeOffsets?: boolean;
  enableAutomaticPunctuation?: boolean;
  enableProfanityFilter?: boolean;
  maxAlternatives?: number;
}

export interface RecognitionResult {
  transcript: string;
  confidence: number;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
  words?: Array<{
    word: string;
    startTime: number;
    endTime: number;
  }>;
}

export interface StreamingRecognitionResult extends RecognitionResult {
  isFinal: boolean;
}

export class SpeechRecognizer {
  private client = getVoiceKitClient();
  private defaultConfig: RecognitionConfig;

  constructor(config: Partial<RecognitionConfig> = {}) {
    this.defaultConfig = {
      encoding: 'LINEAR16',
      sampleRate: 16000,
      channels: 1,
      language: 'ru-RU',
      model: 'general',
      enableWordTimeOffsets: false,
      enableAutomaticPunctuation: true,
      enableProfanityFilter: false,
      maxAlternatives: 1,
      ...config
    };
  }

  /**
   * Распознать аудио файл
   */
  async recognizeFile(
    audioData: Blob | ArrayBuffer,
    config?: Partial<RecognitionConfig>
  ): Promise<RecognitionResult> {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };
      const sttClient = this.client.getSTTClient();

      console.log('Starting file recognition with config:', finalConfig);

      // Конвертация Blob в Buffer если необходимо
      let audioBuffer: ArrayBuffer;
      if (audioData instanceof Blob) {
        audioBuffer = await audioData.arrayBuffer();
      } else {
        audioBuffer = audioData;
      }

      // Конфигурация для VoiceKit
      const audioConfig = {
        encoding: finalConfig.encoding,
        sample_rate_hertz: finalConfig.sampleRate,
        num_channels: finalConfig.channels
      };

      // Вызов распознавания
      const response = await sttClient.recognize(audioBuffer, audioConfig);
      
      return this.parseRecognitionResponse(response);
    } catch (error) {
      console.error('File recognition failed:', error);
      throw new Error(`Recognition failed: ${error.message}`);
    }
  }

  /**
   * Потоковое распознавание речи
   */
  async *recognizeStream(
    audioStream: ReadableStream<Uint8Array>,
    config?: Partial<RecognitionConfig>
  ): AsyncGenerator<StreamingRecognitionResult, void, unknown> {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };
      const sttClient = this.client.getSTTClient();

      console.log('Starting streaming recognition with config:', finalConfig);

      const audioConfig = {
        encoding: finalConfig.encoding,
        sample_rate_hertz: finalConfig.sampleRate,
        num_channels: finalConfig.channels
      };

      const streamConfig = { config: audioConfig };

      // Создание readable stream для VoiceKit
      const reader = audioStream.getReader();
      const streamSource = {
        async *[Symbol.asyncIterator]() {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              yield value;
            }
          } finally {
            reader.releaseLock();
          }
        }
      };

      // Потоковое распознавание
      const responses = sttClient.streaming_recognize(streamSource, streamConfig);
      
      for await (const response of responses) {
        const result = this.parseStreamingResponse(response);
        if (result) {
          yield result;
        }
      }
    } catch (error) {
      console.error('Streaming recognition failed:', error);
      throw new Error(`Streaming recognition failed: ${error.message}`);
    }
  }

  /**
   * Распознать аудио из Blob (например, из MediaRecorder)
   */
  async recognizeBlob(
    audioBlob: Blob,
    config?: Partial<RecognitionConfig>
  ): Promise<RecognitionResult> {
    try {
      // Конвертация WebM в нужный формат
      const audioBuffer = await this.convertBlobToLinear16(audioBlob);
      return await this.recognizeFile(audioBuffer, config);
    } catch (error) {
      console.error('Blob recognition failed:', error);
      throw new Error(`Blob recognition failed: ${error.message}`);
    }
  }

  /**
   * Конвертация WebM Blob в LINEAR16 PCM
   */
  private async convertBlobToLinear16(blob: Blob): Promise<ArrayBuffer> {
    try {
      // Создание Audio Context для декодирования
      const audioContext = new AudioContext({ sampleRate: this.defaultConfig.sampleRate });
      
      // Декодирование аудио
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Конвертация в LINEAR16 PCM
      const channelData = audioBuffer.getChannelData(0); // Берем первый канал
      const pcmData = new Int16Array(channelData.length);
      
      // Конвертация float32 в int16
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      await audioContext.close();
      return pcmData.buffer;
    } catch (error) {
      console.error('Audio conversion failed:', error);
      throw new Error(`Audio conversion failed: ${error.message}`);
    }
  }

  /**
   * Парсинг ответа от VoiceKit для обычного распознавания
   */
  private parseRecognitionResponse(response: any): RecognitionResult {
    try {
      // Структура ответа может отличаться в зависимости от библиотеки
      const results = response.results || response.result || [];
      
      if (results.length === 0) {
        return {
          transcript: '',
          confidence: 0
        };
      }

      const bestResult = results[0];
      const alternatives = bestResult.alternatives || [bestResult];
      
      return {
        transcript: alternatives[0].transcript || '',
        confidence: alternatives[0].confidence || 0,
        alternatives: alternatives.map((alt: any) => ({
          transcript: alt.transcript || '',
          confidence: alt.confidence || 0
        }))
      };
    } catch (error) {
      console.error('Failed to parse recognition response:', error);
      return {
        transcript: '',
        confidence: 0
      };
    }
  }

  /**
   * Парсинг ответа для потокового распознавания
   */
  private parseStreamingResponse(response: any): StreamingRecognitionResult | null {
    try {
      if (!response.results || response.results.length === 0) {
        return null;
      }

      const result = response.results[0];
      const alternatives = result.alternatives || [result];
      
      return {
        transcript: alternatives[0].transcript || '',
        confidence: alternatives[0].confidence || 0,
        isFinal: result.is_final || false,
        alternatives: alternatives.map((alt: any) => ({
          transcript: alt.transcript || '',
          confidence: alt.confidence || 0
        }))
      };
    } catch (error) {
      console.error('Failed to parse streaming response:', error);
      return null;
    }
  }

  /**
   * Обновить конфигурацию по умолчанию
   */
  updateDefaultConfig(newConfig: Partial<RecognitionConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...newConfig };
  }

  /**
   * Получить текущую конфигурацию
   */
  getConfig(): RecognitionConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Проверить поддержку потокового распознавания
   */
  supportsStreaming(): boolean {
    try {
      const sttClient = this.client.getSTTClient();
      return typeof sttClient.streaming_recognize === 'function';
    } catch {
      return false;
    }
  }
}