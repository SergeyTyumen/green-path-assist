/**
 * Audio Recorder
 * Захват аудио с микрофона для VoiceKit
 */

export interface RecorderConfig {
  sampleRate: number;
  channels: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export interface VoiceActivityConfig {
  minSpeechDuration: number; // мс
  maxSpeechDuration: number; // мс
  silenceDurationThreshold: number; // мс
  volumeThreshold: number; // 0-100
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private config: RecorderConfig;
  private vadConfig: VoiceActivityConfig;
  
  // Voice Activity Detection
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vadTimer: NodeJS.Timeout | null = null;
  private speechStartTime: number | null = null;
  private lastSpeechTime: number | null = null;

  // Events
  private onDataAvailable?: (data: Blob) => void;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private onError?: (error: Error) => void;

  constructor(
    config: Partial<RecorderConfig> = {},
    vadConfig: Partial<VoiceActivityConfig> = {}
  ) {
    this.config = {
      sampleRate: 16000,
      channels: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...config
    };

    this.vadConfig = {
      minSpeechDuration: 500,
      maxSpeechDuration: 30000,
      silenceDurationThreshold: 1500,
      volumeThreshold: 20,
      ...vadConfig
    };
  }

  /**
   * Установить обработчики событий
   */
  setEventHandlers(handlers: {
    onDataAvailable?: (data: Blob) => void;
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onError?: (error: Error) => void;
  }) {
    this.onDataAvailable = handlers.onDataAvailable;
    this.onSpeechStart = handlers.onSpeechStart;
    this.onSpeechEnd = handlers.onSpeechEnd;
    this.onError = handlers.onError;
  }

  /**
   * Начать запись
   */
  async startRecording(): Promise<void> {
    try {
      if (this.isRecording) {
        throw new Error('Recording already in progress');
      }

      // Запрос доступа к микрофону
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl
        }
      });

      // Создание MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm; codecs=opus'
      });

      this.audioChunks = [];
      this.isRecording = true;

      // Обработчики MediaRecorder
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.onDataAvailable?.(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop();
      };

      this.mediaRecorder.onerror = (event) => {
        this.onError?.(new Error(`MediaRecorder error: ${event}`));
      };

      // Инициализация VAD
      await this.initializeVAD();

      // Старт записи
      this.mediaRecorder.start(100); // Записываем чанками по 100мс
      
      console.log('Audio recording started');
    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Остановить запись
   */
  stopRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) {
      return;
    }

    this.mediaRecorder.stop();
    this.cleanup();
  }

  /**
   * Инициализация Voice Activity Detection
   */
  private async initializeVAD(): Promise<void> {
    if (!this.audioStream) return;

    try {
      this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.3;
      
      source.connect(this.analyser);
      
      // Запуск мониторинга голосовой активности
      this.startVADMonitoring();
    } catch (error) {
      console.warn('VAD initialization failed:', error);
    }
  }

  /**
   * Мониторинг голосовой активности
   */
  private startVADMonitoring(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVoiceActivity = () => {
      if (!this.isRecording || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      
      // Вычисление уровня звука
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const volume = (average / 255) * 100;

      const now = Date.now();
      const isSpeaking = volume > this.vadConfig.volumeThreshold;

      if (isSpeaking) {
        this.lastSpeechTime = now;

        // Начало речи
        if (!this.speechStartTime) {
          this.speechStartTime = now;
          this.onSpeechStart?.();
        }

        // Проверка максимальной длительности речи
        if (now - this.speechStartTime > this.vadConfig.maxSpeechDuration) {
          this.handleSpeechEnd();
          return;
        }
      } else if (this.speechStartTime && this.lastSpeechTime) {
        // Проверка тишины после речи
        const silenceDuration = now - this.lastSpeechTime;
        
        if (silenceDuration > this.vadConfig.silenceDurationThreshold) {
          const speechDuration = this.lastSpeechTime - this.speechStartTime;
          
          // Проверка минимальной длительности речи
          if (speechDuration >= this.vadConfig.minSpeechDuration) {
            this.handleSpeechEnd();
            return;
          } else {
            // Слишком короткая речь, сбрасываем
            this.speechStartTime = null;
            this.lastSpeechTime = null;
          }
        }
      }

      // Продолжить мониторинг
      this.vadTimer = setTimeout(checkVoiceActivity, 50);
    };

    checkVoiceActivity();
  }

  /**
   * Обработка окончания речи
   */
  private handleSpeechEnd(): void {
    this.onSpeechEnd?.();
    this.speechStartTime = null;
    this.lastSpeechTime = null;
  }

  /**
   * Обработка остановки записи
   */
  private handleRecordingStop(): void {
    if (this.audioChunks.length > 0) {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.onDataAvailable?.(audioBlob);
    }
  }

  /**
   * Очистка ресурсов
   */
  private cleanup(): void {
    this.isRecording = false;

    if (this.vadTimer) {
      clearTimeout(this.vadTimer);
      this.vadTimer = null;
    }

    if (this.audioContext?.state !== 'closed') {
      this.audioContext?.close();
    }
    this.audioContext = null;
    this.analyser = null;

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    this.mediaRecorder = null;
    this.audioChunks = [];
    this.speechStartTime = null;
    this.lastSpeechTime = null;
  }

  /**
   * Получить накопленные аудио данные
   */
  getRecordedAudio(): Blob | null {
    if (this.audioChunks.length === 0) return null;
    return new Blob(this.audioChunks, { type: 'audio/webm' });
  }

  /**
   * Проверить статус записи
   */
  getRecordingStatus() {
    return {
      isRecording: this.isRecording,
      hasSpeech: this.speechStartTime !== null,
      speechDuration: this.speechStartTime ? Date.now() - this.speechStartTime : 0
    };
  }

  /**
   * Обновить конфигурацию VAD
   */
  updateVADConfig(newConfig: Partial<VoiceActivityConfig>): void {
    this.vadConfig = { ...this.vadConfig, ...newConfig };
  }
}