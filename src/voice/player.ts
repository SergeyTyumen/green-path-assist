/**
 * Audio Player
 * Воспроизведение синтезированной речи
 */

export interface PlayerConfig {
  volume: number;
  autoplay: boolean;
  preload: boolean;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export class AudioPlayer {
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private config: PlayerConfig;
  private playbackQueue: ArrayBuffer[] = [];
  private isProcessingQueue = false;

  // Event handlers
  private onPlayStart?: () => void;
  private onPlayEnd?: () => void;
  private onPlayPause?: () => void;
  private onPlayResume?: () => void;
  private onPlayError?: (error: Error) => void;
  private onVolumeChange?: (volume: number) => void;

  constructor(config: Partial<PlayerConfig> = {}) {
    this.config = {
      volume: 0.8,
      autoplay: true,
      preload: false,
      ...config
    };
  }

  /**
   * Установить обработчики событий
   */
  setEventHandlers(handlers: {
    onPlayStart?: () => void;
    onPlayEnd?: () => void;
    onPlayPause?: () => void;
    onPlayResume?: () => void;
    onPlayError?: (error: Error) => void;
    onVolumeChange?: (volume: number) => void;
  }) {
    this.onPlayStart = handlers.onPlayStart;
    this.onPlayEnd = handlers.onPlayEnd;
    this.onPlayPause = handlers.onPlayPause;
    this.onPlayResume = handlers.onPlayResume;
    this.onPlayError = handlers.onPlayError;
    this.onVolumeChange = handlers.onVolumeChange;
  }

  /**
   * Воспроизвести аудио из ArrayBuffer
   */
  async playArrayBuffer(audioData: ArrayBuffer): Promise<void> {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Декодирование аудио данных
      const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));
      
      // Остановка текущего воспроизведения
      this.stop();

      // Создание источника звука
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;

      // Создание узла громкости
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = this.config.volume;

      // Подключение узлов
      this.currentSource.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Обработчики событий
      this.currentSource.onended = () => {
        this.onPlayEnd?.();
        this.currentSource = null;
      };

      // Запуск воспроизведения
      this.currentSource.start(0);
      this.onPlayStart?.();

      console.log('Audio playback started');
    } catch (error) {
      console.error('Audio playback failed:', error);
      this.onPlayError?.(error as Error);
      throw error;
    }
  }

  /**
   * Воспроизвести аудио из Blob
   */
  async playBlob(audioBlob: Blob): Promise<void> {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      await this.playArrayBuffer(arrayBuffer);
    } catch (error) {
      console.error('Blob playback failed:', error);
      this.onPlayError?.(error as Error);
      throw error;
    }
  }

  /**
   * Воспроизвести аудио по URL
   */
  async playUrl(audioUrl: string): Promise<void> {
    try {
      // Остановка текущего воспроизведения
      this.stop();

      // Создание нового аудио элемента
      this.audioElement = new Audio(audioUrl);
      this.audioElement.volume = this.config.volume;
      this.audioElement.preload = this.config.preload ? 'auto' : 'none';

      // Обработчики событий
      this.audioElement.onplay = () => this.onPlayStart?.();
      this.audioElement.onended = () => this.onPlayEnd?.();
      this.audioElement.onpause = () => this.onPlayPause?.();
      this.audioElement.onvolumechange = () => this.onVolumeChange?.(this.audioElement!.volume);
      this.audioElement.onerror = () => {
        const error = new Error(`Audio playback error: ${this.audioElement?.error?.message}`);
        this.onPlayError?.(error);
      };

      // Запуск воспроизведения
      if (this.config.autoplay) {
        await this.audioElement.play();
      }

      console.log('URL audio playback started');
    } catch (error) {
      console.error('URL playback failed:', error);
      this.onPlayError?.(error as Error);
      throw error;
    }
  }

  /**
   * Добавить аудио в очередь воспроизведения
   */
  async queueAudio(audioData: ArrayBuffer): Promise<void> {
    this.playbackQueue.push(audioData);
    
    if (!this.isProcessingQueue) {
      await this.processQueue();
    }
  }

  /**
   * Обработка очереди воспроизведения
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.playbackQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.playbackQueue.length > 0) {
        const audioData = this.playbackQueue.shift()!;
        await this.playArrayBuffer(audioData);
        
        // Ожидание окончания воспроизведения
        await this.waitForPlaybackEnd();
      }
    } catch (error) {
      console.error('Queue processing failed:', error);
      this.onPlayError?.(error as Error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Ожидание окончания воспроизведения
   */
  private waitForPlaybackEnd(): Promise<void> {
    return new Promise((resolve) => {
      const originalHandler = this.onPlayEnd;
      
      this.onPlayEnd = () => {
        this.onPlayEnd = originalHandler;
        originalHandler?.();
        resolve();
      };
    });
  }

  /**
   * Остановить воспроизведение
   */
  stop(): void {
    try {
      if (this.currentSource) {
        this.currentSource.stop();
        this.currentSource.disconnect();
        this.currentSource = null;
      }

      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.audioElement = null;
      }

      console.log('Audio playback stopped');
    } catch (error) {
      console.error('Failed to stop audio:', error);
    }
  }

  /**
   * Приостановить воспроизведение
   */
  pause(): void {
    try {
      if (this.audioElement && !this.audioElement.paused) {
        this.audioElement.pause();
        this.onPlayPause?.();
      }
    } catch (error) {
      console.error('Failed to pause audio:', error);
    }
  }

  /**
   * Возобновить воспроизведение
   */
  async resume(): Promise<void> {
    try {
      if (this.audioElement && this.audioElement.paused) {
        await this.audioElement.play();
        this.onPlayResume?.();
      }
    } catch (error) {
      console.error('Failed to resume audio:', error);
      this.onPlayError?.(error as Error);
    }
  }

  /**
   * Установить громкость (0.0 - 1.0)
   */
  setVolume(volume: number): void {
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      this.config.volume = clampedVolume;

      if (this.audioElement) {
        this.audioElement.volume = clampedVolume;
      }

      this.onVolumeChange?.(clampedVolume);
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  }

  /**
   * Получить текущую громкость
   */
  getVolume(): number {
    if (this.audioElement) {
      return this.audioElement.volume;
    }
    return this.config.volume;
  }

  /**
   * Получить состояние воспроизведения
   */
  getPlaybackState(): PlaybackState {
    if (this.audioElement) {
      return {
        isPlaying: !this.audioElement.paused && !this.audioElement.ended,
        isPaused: this.audioElement.paused,
        currentTime: this.audioElement.currentTime,
        duration: this.audioElement.duration || 0,
        volume: this.audioElement.volume
      };
    }

    return {
      isPlaying: this.currentSource !== null,
      isPaused: false,
      currentTime: 0,
      duration: 0,
      volume: this.config.volume
    };
  }

  /**
   * Очистить очередь воспроизведения
   */
  clearQueue(): void {
    this.playbackQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Получить размер очереди
   */
  getQueueSize(): number {
    return this.playbackQueue.length;
  }

  /**
   * Проверить поддержку формата аудио
   */
  canPlayType(mimeType: string): boolean {
    const audio = new Audio();
    return audio.canPlayType(mimeType) !== '';
  }

  /**
   * Очистка ресурсов
   */
  cleanup(): void {
    try {
      this.stop();
      this.clearQueue();

      if (this.audioContext?.state !== 'closed') {
        this.audioContext?.close();
      }
      this.audioContext = null;

      console.log('AudioPlayer cleanup completed');
    } catch (error) {
      console.error('AudioPlayer cleanup failed:', error);
    }
  }

  /**
   * Обновить конфигурацию
   */
  updateConfig(newConfig: Partial<PlayerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.volume !== undefined) {
      this.setVolume(newConfig.volume);
    }
  }
}