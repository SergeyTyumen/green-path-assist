/**
 * Tinkoff VoiceKit Assistant Component
 * React компонент для интеграции Tinkoff VoiceKit с CRM
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings,
  Activity,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TinkoffVoiceAssistant } from '@/voice';

interface TinkoffVoiceAssistantProps {
  onSpeechRecognized?: (text: string) => void;
  onResponseGenerated?: (response: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export const TinkoffVoiceAssistantComponent: React.FC<TinkoffVoiceAssistantProps> = ({
  onSpeechRecognized,
  onResponseGenerated,
  onError,
  className
}) => {
  const { toast } = useToast();
  const assistantRef = useRef<TinkoffVoiceAssistant | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [lastRecognizedText, setLastRecognizedText] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  // Инициализация VoiceKit ассистента
  const initializeAssistant = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      
      // Получение API ключей из переменных окружения
      const apiKey = import.meta.env.VITE_VK_API_KEY;
      const secretKey = import.meta.env.VITE_VK_SECRET_KEY;
      
      if (!apiKey || !secretKey) {
        throw new Error('VoiceKit API ключи не найдены. Проверьте переменные окружения VITE_VK_API_KEY и VITE_VK_SECRET_KEY');
      }

      // Создание экземпляра ассистента
      assistantRef.current = new TinkoffVoiceAssistant(
        { apiKey, secretKey },
        {
          sampleRate: 16000,
          channels: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        {
          language: 'ru-RU',
          model: 'general',
          enableAutomaticPunctuation: true
        },
        {
          voice: 'alena',
          audioEncoding: 'LINEAR16',
          sampleRate: 48000,
          speed: 1.0
        },
        {
          volume: volume,
          autoplay: true
        }
      );

      // Настройка обработчиков событий
      assistantRef.current.setEventHandlers({
        onSpeechRecognized: (text) => {
          console.log('Speech recognized:', text);
          setLastRecognizedText(text);
          onSpeechRecognized?.(text);
        },
        onResponseReceived: (response) => {
          console.log('Response received:', response);
          setLastResponse(response);
          onResponseGenerated?.(response);
        },
        onListeningStart: () => {
          setIsListening(true);
        },
        onListeningEnd: () => {
          setIsListening(false);
        },
        onSpeakingStart: () => {
          setIsSpeaking(true);
        },
        onSpeakingEnd: () => {
          setIsSpeaking(false);
        },
        onError: (error) => {
          console.error('VoiceKit error:', error);
          setConnectionStatus('error');
          onError?.(error);
          toast({
            title: 'Ошибка голосового ассистента',
            description: error.message,
            variant: 'destructive'
          });
        }
      });

      // Проверка работоспособности
      const isHealthy = await assistantRef.current.checkHealth();
      if (!isHealthy) {
        throw new Error('VoiceKit сервис недоступен');
      }

      setIsInitialized(true);
      setConnectionStatus('connected');
      
      toast({
        title: 'VoiceKit подключен',
        description: 'Tinkoff VoiceKit готов к работе'
      });

      console.log('Tinkoff VoiceKit assistant initialized successfully');
    } catch (error) {
      console.error('Failed to initialize VoiceKit assistant:', error);
      setConnectionStatus('error');
      setIsInitialized(false);
      
      toast({
        title: 'Ошибка инициализации',
        description: error.message || 'Не удалось подключиться к Tinkoff VoiceKit',
        variant: 'destructive'
      });
    }
  }, [volume, onSpeechRecognized, onResponseGenerated, onError, toast]);

  // Запуск непрерывного режима
  const startContinuousMode = useCallback(async () => {
    if (!assistantRef.current || !isInitialized) {
      await initializeAssistant();
      return;
    }

    try {
      await assistantRef.current.startContinuousMode();
      setIsActive(true);
      
      toast({
        title: 'Голосовой режим активен',
        description: 'Говорите, ассистент вас слушает'
      });
    } catch (error) {
      console.error('Failed to start continuous mode:', error);
      toast({
        title: 'Ошибка активации',
        description: 'Не удалось запустить голосовой режим',
        variant: 'destructive'
      });
    }
  }, [isInitialized, initializeAssistant, toast]);

  // Остановка непрерывного режима
  const stopContinuousMode = useCallback(async () => {
    if (!assistantRef.current) return;

    try {
      await assistantRef.current.stopContinuousMode();
      setIsActive(false);
      setIsListening(false);
      setIsSpeaking(false);
      
      toast({
        title: 'Голосовой режим остановлен',
        description: 'Ассистент больше не слушает'
      });
    } catch (error) {
      console.error('Failed to stop continuous mode:', error);
    }
  }, [toast]);

  // Обработка изменения громкости
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (assistantRef.current) {
      assistantRef.current.setVolume(newVolume);
    }
  }, []);

  // Обработка текстовой команды
  const handleTextCommand = useCallback(async (text: string) => {
    if (!assistantRef.current || !isInitialized) {
      toast({
        title: 'Ассистент не готов',
        description: 'Сначала инициализируйте VoiceKit',
        variant: 'destructive'
      });
      return;
    }

    try {
      await assistantRef.current.processTextCommand(text);
    } catch (error) {
      console.error('Failed to process text command:', error);
      toast({
        title: 'Ошибка обработки',
        description: 'Не удалось обработать текстовую команду',
        variant: 'destructive'
      });
    }
  }, [isInitialized, toast]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (assistantRef.current) {
        assistantRef.current.cleanup();
      }
    };
  }, []);

  // Автоинициализация при монтировании
  useEffect(() => {
    const autoInit = async () => {
      const apiKey = import.meta.env.VITE_VK_API_KEY;
      const secretKey = import.meta.env.VITE_VK_SECRET_KEY;
      
      if (apiKey && secretKey) {
        await initializeAssistant();
      }
    };

    autoInit();
  }, [initializeAssistant]);

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Activity className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Подключено';
      case 'connecting':
        return 'Подключение...';
      case 'error':
        return 'Ошибка';
      default:
        return 'Отключено';
    }
  };

  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Tinkoff VoiceKit
          </span>
          <div className="flex items-center gap-2">
            {getConnectionStatusIcon()}
            <span className="text-sm text-muted-foreground">
              {getConnectionStatusText()}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Статус и управление */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {isListening && (
              <Badge variant="secondary" className="animate-pulse">
                <Mic className="h-3 w-3 mr-1" />
                Слушаю
              </Badge>
            )}
            {isSpeaking && (
              <Badge variant="secondary" className="animate-pulse">
                <Volume2 className="h-3 w-3 mr-1" />
                Говорю
              </Badge>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {/* Открыть настройки */}}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Кнопка активации */}
        <div className="flex gap-2">
          {!isInitialized ? (
            <Button 
              onClick={initializeAssistant} 
              className="flex-1"
              disabled={connectionStatus === 'connecting'}
            >
              {connectionStatus === 'connecting' ? 'Подключение...' : 'Инициализировать'}
            </Button>
          ) : (
            <Button
              onClick={isActive ? stopContinuousMode : startContinuousMode}
              variant={isActive ? "destructive" : "default"}
              className="flex-1"
            >
              {isActive ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Остановить
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Начать слушать
                </>
              )}
            </Button>
          )}
        </div>

        {/* Контроль громкости */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Громкость</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVolumeChange(volume > 0 ? 0 : 0.8)}
            >
              {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Последний распознанный текст */}
        {lastRecognizedText && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Распознано:</div>
            <div className="text-sm">{lastRecognizedText}</div>
          </div>
        )}

        {/* Последний ответ */}
        {lastResponse && (
          <div className="p-3 bg-primary/10 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Ответ:</div>
            <div className="text-sm">{lastResponse}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TinkoffVoiceAssistantComponent;