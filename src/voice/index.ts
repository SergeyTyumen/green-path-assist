/**
 * Tinkoff VoiceKit Integration
 * Главный модуль для работы с голосовым ассистентом
 */

export { VoiceKitClient, initializeVoiceKit, getVoiceKitClient, createAudioConfig } from './client';
export { AudioRecorder } from './recorder';
export { SpeechRecognizer } from './recognizer';
export { SpeechSynthesizer } from './synthesizer';
export { AudioPlayer } from './player';

export type { VoiceKitConfig, AudioConfig } from './client';
export type { RecorderConfig, VoiceActivityConfig } from './recorder';
export type { RecognitionConfig, RecognitionResult, StreamingRecognitionResult } from './recognizer';
export type { SynthesisConfig, SynthesisResult } from './synthesizer';
export type { PlayerConfig, PlaybackState } from './player';

import { VoiceKitClient, initializeVoiceKit } from './client';
import { AudioRecorder } from './recorder';
import { SpeechRecognizer } from './recognizer';
import { SpeechSynthesizer } from './synthesizer';
import { AudioPlayer } from './player';

/**
 * Полнофункциональный голосовой ассистент с Tinkoff VoiceKit
 */
export class TinkoffVoiceAssistant {
  private client: VoiceKitClient;
  private recorder: AudioRecorder;
  private recognizer: SpeechRecognizer;
  private synthesizer: SpeechSynthesizer;
  private player: AudioPlayer;
  
  private isListening = false;
  private isSpeaking = false;
  private isActive = false;

  // Event handlers
  private onSpeechRecognized?: (text: string) => void;
  private onResponseReceived?: (response: string) => void;
  private onListeningStart?: () => void;
  private onListeningEnd?: () => void;
  private onSpeakingStart?: () => void;
  private onSpeakingEnd?: () => void;
  private onError?: (error: Error) => void;

  constructor(
    voiceKitConfig: { apiKey: string; secretKey: string },
    recorderConfig?: any,
    recognizerConfig?: any,
    synthesizerConfig?: any,
    playerConfig?: any
  ) {
    // Инициализация VoiceKit клиента
    this.client = initializeVoiceKit(voiceKitConfig);
    
    // Инициализация модулей
    this.recorder = new AudioRecorder(recorderConfig);
    this.recognizer = new SpeechRecognizer(recognizerConfig);
    this.synthesizer = new SpeechSynthesizer(synthesizerConfig);
    this.player = new AudioPlayer(playerConfig);

    this.setupEventHandlers();
  }

  /**
   * Настройка обработчиков событий
   */
  private setupEventHandlers(): void {
    // Recorder events
    this.recorder.setEventHandlers({
      onDataAvailable: async (audioBlob) => {
        if (this.isActive) {
          await this.processAudioInput(audioBlob);
        }
      },
      onSpeechStart: () => {
        this.onListeningStart?.();
      },
      onSpeechEnd: () => {
        this.onListeningEnd?.();
      },
      onError: (error) => {
        this.onError?.(error);
      }
    });

    // Player events
    this.player.setEventHandlers({
      onPlayStart: () => {
        this.isSpeaking = true;
        this.onSpeakingStart?.();
      },
      onPlayEnd: () => {
        this.isSpeaking = false;
        this.onSpeakingEnd?.();
        
        // Возобновить прослушивание после завершения речи
        if (this.isActive && !this.isListening) {
          this.startListening();
        }
      },
      onPlayError: (error) => {
        this.isSpeaking = false;
        this.onError?.(error);
      }
    });
  }

  /**
   * Установить обработчики событий
   */
  setEventHandlers(handlers: {
    onSpeechRecognized?: (text: string) => void;
    onResponseReceived?: (response: string) => void;
    onListeningStart?: () => void;
    onListeningEnd?: () => void;
    onSpeakingStart?: () => void;
    onSpeakingEnd?: () => void;
    onError?: (error: Error) => void;
  }): void {
    this.onSpeechRecognized = handlers.onSpeechRecognized;
    this.onResponseReceived = handlers.onResponseReceived;
    this.onListeningStart = handlers.onListeningStart;
    this.onListeningEnd = handlers.onListeningEnd;
    this.onSpeakingStart = handlers.onSpeakingStart;
    this.onSpeakingEnd = handlers.onSpeakingEnd;
    this.onError = handlers.onError;
  }

  /**
   * Запустить непрерывный режим прослушивания
   */
  async startContinuousMode(): Promise<void> {
    try {
      this.isActive = true;
      await this.startListening();
      console.log('Continuous voice mode started');
    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Остановить непрерывный режим
   */
  async stopContinuousMode(): Promise<void> {
    try {
      this.isActive = false;
      await this.stopListening();
      this.player.stop();
      console.log('Continuous voice mode stopped');
    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Начать прослушивание
   */
  async startListening(): Promise<void> {
    if (this.isListening || this.isSpeaking) {
      return;
    }

    try {
      this.isListening = true;
      await this.recorder.startRecording();
      console.log('Started listening');
    } catch (error) {
      this.isListening = false;
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Остановить прослушивание
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      this.isListening = false;
      this.recorder.stopRecording();
      console.log('Stopped listening');
    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Обработка входящего аудио
   */
  private async processAudioInput(audioBlob: Blob): Promise<void> {
    try {
      console.log('Processing audio input');
      
      // Распознавание речи
      const result = await this.recognizer.recognizeBlob(audioBlob);
      
      if (result.transcript && result.transcript.trim()) {
        console.log('Speech recognized:', result.transcript);
        this.onSpeechRecognized?.(result.transcript);
        
        // Здесь должна быть логика обработки команды через CRM
        // Пока что просто эхо
        const response = `Вы сказали: ${result.transcript}`;
        await this.speak(response);
      }
    } catch (error) {
      console.error('Failed to process audio input:', error);
      this.onError?.(error as Error);
    }
  }

  /**
   * Произнести текст
   */
  async speak(text: string): Promise<void> {
    try {
      console.log('Speaking:', text);
      
      // Остановить прослушивание во время речи
      if (this.isListening) {
        await this.stopListening();
      }

      // Синтез речи
      const result = await this.synthesizer.synthesize(text);
      
      // Воспроизведение
      await this.player.playArrayBuffer(result.audioData);
      
      this.onResponseReceived?.(text);
    } catch (error) {
      console.error('Failed to speak:', error);
      this.onError?.(error as Error);
      
      // Возобновить прослушивание при ошибке
      if (this.isActive && !this.isListening) {
        this.startListening();
      }
    }
  }

  /**
   * Обработать текстовую команду (без голоса)
   */
  async processTextCommand(text: string): Promise<void> {
    try {
      this.onSpeechRecognized?.(text);
      
      // Здесь должна быть логика обработки команды через CRM
      const response = `Команда обработана: ${text}`;
      await this.speak(response);
    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Установить громкость
   */
  setVolume(volume: number): void {
    this.player.setVolume(volume);
  }

  /**
   * Получить состояние ассистента
   */
  getState() {
    return {
      isActive: this.isActive,
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      recordingStatus: this.recorder.getRecordingStatus(),
      playbackState: this.player.getPlaybackState()
    };
  }

  /**
   * Проверить доступность VoiceKit
   */
  async checkHealth(): Promise<boolean> {
    try {
      return await this.client.healthCheck();
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Очистка ресурсов
   */
  cleanup(): void {
    try {
      this.stopContinuousMode();
      this.player.cleanup();
      this.synthesizer.cleanup();
      console.log('TinkoffVoiceAssistant cleanup completed');
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}