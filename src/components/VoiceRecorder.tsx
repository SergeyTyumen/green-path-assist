import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

export default function VoiceRecorder({ onTranscription }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось получить доступ к микрофону",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('speech-to-text', {
          body: { audio: base64Audio },
        });

        if (error) throw error;

        if (data.text) {
          onTranscription(data.text);
          toast({
            title: "Распознавание завершено",
            description: "Текст добавлен к описанию",
          });
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось распознать речь",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={isRecording ? stopRecording : startRecording}
      disabled={isProcessing}
      variant={isRecording ? "destructive" : "outline"}
      size="sm"
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Обработка...
        </>
      ) : isRecording ? (
        <>
          <MicOff className="h-4 w-4 mr-2" />
          Остановить
        </>
      ) : (
        <>
          <Mic className="h-4 w-4 mr-2" />
          Голосовой ввод
        </>
      )}
    </Button>
  );
}