import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Bot, 
  User,
  Settings,
  Trash2,
  Copy,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
  thinking?: boolean;
}

interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
  volume: number;
}

const VoiceChatAssistant = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Привет! Я ваш голосовой помощник руководителя. Могу отвечать на вопросы о клиентах, сметах, задачах и помочь управлять другими ИИ-помощниками. Спрашивайте голосом или текстом!',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    isConnected: false,
    volume: 0.8
  });
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Add message helper
  const addMessage = useCallback((type: 'user' | 'assistant', content: string, isVoice = false) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      isVoice
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  // Send text message
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    addMessage('user', userMessage);

    // Add thinking indicator
    const thinkingMessage: Message = {
      id: 'thinking',
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      thinking: true
    };
    setMessages(prev => [...prev, thinkingMessage]);

    // Get AI response
    try {
      const response = await generateResponse(userMessage);
      setMessages(prev => prev.filter(m => m.id !== 'thinking'));
      addMessage('assistant', response);
      
      // If voice mode is enabled, speak the response
      if (isVoiceMode) {
        const utterance = new SpeechSynthesisUtterance(response);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = voiceState.volume;
        utterance.lang = 'ru-RU';
        
        utterance.onend = () => {
          setVoiceState(prev => ({ ...prev, isSpeaking: false }));
        };
        
        setVoiceState(prev => ({ ...prev, isSpeaking: true }));
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== 'thinking'));
      addMessage('assistant', 'Извините, произошла ошибка. Попробуйте еще раз.');
    }
  }, [inputValue, addMessage, isVoiceMode, voiceState.volume]);

  // Generate AI response using Supabase edge function
  const generateResponse = async (userMessage: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('voice-chat', {
        body: { message: userMessage, context: 'general' }
      });

      if (error) {
        console.error('Error calling voice-chat function:', error);
        return 'Извините, произошла ошибка. Попробуйте еще раз.';
      }

      return data.reply || 'Не удалось получить ответ от ИИ-помощника.';
    } catch (error) {
      console.error('Error in generateResponse:', error);
      return 'Произошла ошибка при обращении к ИИ-помощнику.';
    }
  };

  // Text-to-speech function
  const speakText = useCallback((text: string) => {
    if (!isVoiceMode) return;
    
    setVoiceState(prev => ({ ...prev, isSpeaking: true }));
    
    // Use Web Speech API for TTS (fallback implementation)
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = voiceState.volume;
    utterance.lang = 'ru-RU';
    
    utterance.onend = () => {
      setVoiceState(prev => ({ ...prev, isSpeaking: false }));
    };
    
    speechSynthesis.speak(utterance);
  }, [isVoiceMode, voiceState.volume]);

  // Real voice recording with MediaRecorder
  const startVoiceRecording = useCallback(async () => {
    try {
      console.log('Starting voice recording...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setVoiceState(prev => ({ ...prev, isListening: true, isConnected: true }));
      addMessage('user', '🎤 Слушаю...', true);
      
      // Initialize MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm; codecs=opus'
      });
      
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunks.length === 0) {
          console.warn('No audio data recorded');
          setVoiceState(prev => ({ ...prev, isListening: false }));
          setMessages(prev => prev.filter(m => m.content !== '🎤 Слушаю...'));
          return;
        }
        
        try {
          // Convert audio to base64
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Convert to base64
          let binary = '';
          const chunkSize = 0x8000;
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
            binary += String.fromCharCode.apply(null, Array.from(chunk));
          }
          const base64Audio = btoa(binary);
          
          console.log('Sending audio to speech-to-text...');
          
          // Send to speech-to-text function
          const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('speech-to-text', {
            body: { audio: base64Audio }
          });
          
          setVoiceState(prev => ({ ...prev, isListening: false }));
          setMessages(prev => prev.filter(m => m.content !== '🎤 Слушаю...'));
          
          if (transcriptionError) {
            console.error('Transcription error:', transcriptionError);
            addMessage('assistant', 'Извините, не удалось распознать речь. Попробуйте еще раз.');
            return;
          }
          
          const transcript = transcriptionData.text || '';
          console.log('Transcription result:', transcript);
          
          if (!transcript.trim()) {
            addMessage('assistant', 'Не удалось распознать речь. Попробуйте говорить громче и четче.');
            return;
          }
          
          addMessage('user', transcript, true);
          
          // Add thinking indicator
          const thinkingMessage: Message = {
            id: 'thinking',
            type: 'assistant',
            content: '',
            timestamp: new Date(),
            thinking: true
          };
          setMessages(prev => [...prev, thinkingMessage]);
          
          // Process voice message with enhanced system
          try {
            const response = await generateResponse(transcript);
            setMessages(prev => prev.filter(m => m.id !== 'thinking'));
            addMessage('assistant', response);
            
            // Save to command history
            await supabase.functions.invoke('voice-chat', {
              body: { 
                message: `create_command_history: ${JSON.stringify({
                  voice_text: transcript,
                  transcript: transcript,
                  actions: ['voice_processing'],
                  execution_result: { response }
                })}` 
              }
            });
            
            if (isVoiceMode) {
              // Use Web Speech API for TTS
              const utterance = new SpeechSynthesisUtterance(response);
              utterance.rate = 0.9;
              utterance.pitch = 1;
              utterance.volume = voiceState.volume;
              utterance.lang = 'ru-RU';
              
              utterance.onend = () => {
                setVoiceState(prev => ({ ...prev, isSpeaking: false }));
              };
              
              setVoiceState(prev => ({ ...prev, isSpeaking: true }));
              speechSynthesis.speak(utterance);
            }
          } catch (error) {
            console.error('Error processing voice message:', error);
            setMessages(prev => prev.filter(m => m.id !== 'thinking'));
            addMessage('assistant', 'Извините, произошла ошибка при обработке команды.');
          }
          
        } catch (error) {
          console.error('Error processing audio:', error);
          setVoiceState(prev => ({ ...prev, isListening: false }));
          setMessages(prev => prev.filter(m => m.content !== '🎤 Слушаю...'));
          addMessage('assistant', 'Ошибка при обработке аудио. Попробуйте еще раз.');
        }
      };
      
      // Store recorder reference for stopping
      (window as any).currentRecorder = mediaRecorder;
      
      mediaRecorder.start();
      console.log('MediaRecorder started');
      
    } catch (error) {
      console.error('Error starting voice recording:', error);
      setVoiceState(prev => ({ ...prev, isListening: false }));
      toast({
        title: 'Ошибка доступа к микрофону',
        description: 'Разрешите доступ к микрофону для голосового ввода',
        variant: 'destructive'
      });
    }
  }, [addMessage, toast, isVoiceMode, generateResponse, voiceState.volume]);

  const stopVoiceRecording = useCallback(() => {
    console.log('Stopping voice recording...');
    const recorder = (window as any).currentRecorder;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
    setVoiceState(prev => ({ ...prev, isListening: false }));
  }, []);

  const toggleVoiceMode = useCallback(() => {
    setIsVoiceMode(prev => !prev);
    if (!isVoiceMode) {
      toast({
        title: 'Голосовой режим включен',
        description: 'Теперь помощник будет отвечать голосом'
      });
    }
  }, [isVoiceMode, toast]);

  const clearChat = useCallback(() => {
    setMessages([{
      id: '1',
      type: 'assistant',
      content: 'Чат очищен. Чем могу помочь?',
      timestamp: new Date(),
    }]);
  }, []);

  // Get command history
  const [commandHistory, setCommandHistory] = useState<any[]>([]);
  
  const loadCommandHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('voice-chat', {
        body: { message: 'get_command_history' }
      });
      
      if (!error && data) {
        setCommandHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading command history:', error);
    }
  }, []);

  useEffect(() => {
    loadCommandHistory();
  }, [loadCommandHistory]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Голосовой помощник руководителя</h1>
            <p className="text-sm text-muted-foreground">
              {voiceState.isConnected ? (
                voiceState.isListening ? (
                  <span className="text-green-500 flex items-center gap-1">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    Слушаю...
                  </span>
                ) : voiceState.isSpeaking ? (
                  <span className="text-blue-500 flex items-center gap-1">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                    Говорю...
                  </span>
                ) : (
                  <span className="text-green-500">Готов к работе</span>
                )
              ) : (
                'Управление CRM через голос и текст'
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={isVoiceMode ? "default" : "outline"}
            size="sm"
            onClick={toggleVoiceMode}
            className="gap-1"
          >
            {isVoiceMode ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {isVoiceMode ? 'Голос ВКЛ' : 'Голос ВЫКЛ'}
          </Button>
          <Button variant="outline" size="sm" onClick={clearChat}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.type === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2 relative group",
                  message.type === 'user'
                    ? "bg-primary text-primary-foreground ml-12"
                    : "bg-card border shadow-sm"
                )}
              >
                {message.thinking ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm">Думаю...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.isVoice && (
                        <Badge variant="secondary" className="text-xs">
                          <Mic className="h-3 w-3 mr-1" />
                          Голос
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              {message.type === 'user' && (
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card/50 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Спросите о клиентах, сметах, задачах или дайте поручение..."
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                className="pr-12"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              size="default"
              variant={voiceState.isListening ? "destructive" : "default"}
              className={cn(
                "h-10 w-10 p-0 relative",
                voiceState.isListening && "animate-pulse"
              )}
              onMouseDown={startVoiceRecording}
              onMouseUp={stopVoiceRecording}
              onMouseLeave={stopVoiceRecording}
            >
              {voiceState.isListening ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
              {voiceState.isListening && (
                <div className="absolute inset-0 rounded-md bg-destructive/20 animate-ping" />
              )}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Нажмите и удерживайте кнопку микрофона для голосового ввода
          </p>
          
          {/* Command History */}
          {commandHistory.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Последние голосовые команды:</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {commandHistory.slice(0, 5).map((cmd: any) => (
                  <div key={cmd.id} className="text-xs text-muted-foreground p-2 bg-background rounded border-l-2 border-primary/20">
                    <div className="font-medium">{cmd.transcript}</div>
                    <div className="text-xs opacity-60">
                      {new Date(cmd.created_at).toLocaleString('ru-RU')} • {cmd.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceChatAssistant;