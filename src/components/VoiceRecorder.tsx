import { useState, useRef, useEffect } from "react";
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
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  const { toast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (!isMountedRef.current) return;
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      if (isMountedRef.current) {
        setIsRecording(true);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      if (isMountedRef.current) {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: "Не удалось получить доступ к микрофону",
        });
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (isMountedRef.current) {
        setIsRecording(false);
        setIsProcessing(true);
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    if (!isMountedRef.current) return;
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (!isMountedRef.current) return;
        
        const base64Audio = (reader.result as string).split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('speech-to-text', {
          body: { audio: base64Audio },
        });

        if (!isMountedRef.current) return;

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
      if (isMountedRef.current) {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: "Не удалось распознать речь",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  };

  return (
    <Button
      onMouseDown={!isProcessing ? startRecording : undefined}
      onMouseUp={isRecording ? stopRecording : undefined}
      onMouseLeave={isRecording ? stopRecording : undefined}
      onTouchStart={!isProcessing ? startRecording : undefined}
      onTouchEnd={isRecording ? stopRecording : undefined}
      disabled={isProcessing}
      variant={isRecording ? "destructive" : "outline"}
      size="sm"
      className="select-none"
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Обработка...
        </>
      ) : isRecording ? (
        <>
          <MicOff className="h-4 w-4 mr-2" />
          Удерживайте для записи
        </>
      ) : (
        <>
          <Mic className="h-4 w-4 mr-2" />
          Удерживайте для записи
        </>
      )}
    </Button>
  );
}