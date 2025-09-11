import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ttsService, TTSOptions, TextToSpeechService } from "@/utils/textToSpeech";
import { Play, Square, Volume2 } from "lucide-react";

interface TTSTestButtonProps {
  provider: 'web_speech' | 'openai' | 'elevenlabs' | 'yandex';
  voice?: string;
  rate?: number;
  pitch?: number;
  apiKey?: string;
  disabled?: boolean;
}

const TEST_PHRASES = {
  ru: "Привет! Меня зовут виртуальный помощник. Как дела?",
  en: "Hello! My name is virtual assistant. How are you doing?"
};

export function TTSTestButton({ 
  provider, 
  voice, 
  rate = 1.0, 
  pitch = 1.0, 
  apiKey,
  disabled = false
}: TTSTestButtonProps) {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const testTTS = async () => {
    if (isPlaying) {
      // Остановить воспроизведение
      ttsService.stop();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const testText = provider === 'yandex' ? TEST_PHRASES.ru : TEST_PHRASES.en;
      
      const options: TTSOptions = {
        text: testText,
        provider,
        voice,
        rate,
        pitch,
        apiKey
      };

      setIsPlaying(true);
      await ttsService.speak(options);
      
      toast({
        title: "Тест завершен",
        description: `Голос ${provider} успешно воспроизведен`,
      });
    } catch (error) {
      console.error('TTS Test Error:', error);
      toast({
        title: "Ошибка тестирования",
        description: error instanceof Error ? error.message : "Не удалось воспроизвести голос",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const isSupported = TextToSpeechService.isProviderSupported(provider);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={testTTS}
      disabled={disabled || !isSupported || isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Volume2 className="h-4 w-4 animate-pulse" />
          Загрузка...
        </>
      ) : isPlaying ? (
        <>
          <Square className="h-4 w-4" />
          Стоп
        </>
      ) : (
        <>
          <Play className="h-4 w-4" />
          Тест голоса
        </>
      )}
    </Button>
  );
}