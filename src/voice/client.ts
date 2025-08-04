/**
 * Tinkoff VoiceKit Client
 * Инициализация и управление соединением с VoiceKit API
 */

// Mock implementation for TinkoffVoiceKit since the package isn't publicly available
class MockTinkoffSpeechToText {
  constructor(apiKey: string, secretKey: string) {
    console.log('Mock TinkoffSpeechToText initialized');
  }

  async recognize(audioBuffer: ArrayBuffer, config: any) {
    console.log('Mock recognize called');
    return {
      results: [{
        alternatives: [{
          transcript: 'Mock transcription result',
          confidence: 0.9
        }]
      }]
    };
  }

  async *streaming_recognize(audioStream: any, config: any) {
    console.log('Mock streaming_recognize called');
    yield {
      results: [{
        alternatives: [{
          transcript: 'Mock streaming result',
          confidence: 0.9
        }],
        is_final: true
      }]
    };
  }
}

class MockTinkoffLongRunning {
  constructor(apiKey: string, secretKey: string) {
    console.log('Mock TinkoffLongRunning initialized');
  }
}

export interface VoiceKitConfig {
  apiKey: string;
  secretKey: string;
  endpoint?: string;
}

export interface AudioConfig {
  encoding: string;
  sampleRate: number;
  channels: number;
}

export class VoiceKitClient {
  private config: VoiceKitConfig;
  private sttClient: any;
  private longRunningClient: any;

  constructor(config: VoiceKitConfig) {
    this.config = config;
    this.initializeClients();
  }

  private initializeClients() {
    try {
      // Инициализация STT клиента
      this.sttClient = new MockTinkoffSpeechToText(
        this.config.apiKey,
        this.config.secretKey
      );

      // Инициализация Long Running клиента для длинных аудио
      this.longRunningClient = new MockTinkoffLongRunning(
        this.config.apiKey,
        this.config.secretKey
      );

      console.log('VoiceKit clients initialized successfully');
    } catch (error) {
      console.error('Failed to initialize VoiceKit clients:', error);
      throw new Error(`VoiceKit initialization failed: ${error.message}`);
    }
  }

  /**
   * Получить STT клиент для распознавания речи
   */
  getSTTClient() {
    return this.sttClient;
  }

  /**
   * Получить Long Running клиент для длинных аудио
   */
  getLongRunningClient() {
    return this.longRunningClient;
  }

  /**
   * Проверить подключение к сервису
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Простая проверка - пытаемся создать тестовый запрос
      const testConfig = {
        encoding: 'LINEAR16',
        sample_rate_hertz: 16000,
        num_channels: 1
      };
      
      // Это не отправляет реальный запрос, только проверяет клиент
      return this.sttClient !== null && this.longRunningClient !== null;
    } catch (error) {
      console.error('VoiceKit health check failed:', error);
      return false;
    }
  }

  /**
   * Получить информацию о конфигурации
   */
  getConfig(): Omit<VoiceKitConfig, 'secretKey'> {
    return {
      apiKey: this.config.apiKey ? '***' + this.config.apiKey.slice(-4) : '',
      endpoint: this.config.endpoint
    };
  }
}

// Глобальный экземпляр клиента
let globalVoiceKitClient: VoiceKitClient | null = null;

/**
 * Инициализировать глобальный VoiceKit клиент
 */
export function initializeVoiceKit(config: VoiceKitConfig): VoiceKitClient {
  globalVoiceKitClient = new VoiceKitClient(config);
  return globalVoiceKitClient;
}

/**
 * Получить глобальный VoiceKit клиент
 */
export function getVoiceKitClient(): VoiceKitClient {
  if (!globalVoiceKitClient) {
    throw new Error('VoiceKit client not initialized. Call initializeVoiceKit first.');
  }
  return globalVoiceKitClient;
}

/**
 * Создать конфигурацию аудио для VoiceKit
 */
export function createAudioConfig(sampleRate = 16000, channels = 1): AudioConfig {
  return {
    encoding: 'LINEAR16',
    sampleRate,
    channels
  };
}