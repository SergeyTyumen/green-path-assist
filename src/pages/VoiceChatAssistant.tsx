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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
        speakResponse(response);
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== 'thinking'));
      
      const errorMessage = error.message.includes('OpenAI') 
        ? 'ИИ-помощник временно недоступен. Попробуйте позже.'
        : error.message.includes('network') || error.message.includes('fetch')
        ? 'Проблемы с сетью. Проверьте подключение к интернету.'
        : 'Извините, произошла ошибка. Попробуйте еще раз.';
      
      addMessage('assistant', errorMessage);
    }
  }, [inputValue, addMessage, isVoiceMode, voiceState.volume]);

  // Generate AI response using enhanced voice chat system
  const generateResponse = async (userMessage: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-voice-chat', {
        body: { 
          message: userMessage, 
          conversation_history: messages.slice(-10).map(m => ({
            type: m.type,
            content: m.content
          }))
        }
      });

      if (error) {
        console.error('Error calling enhanced-voice-chat function:', error);
        return 'Извините, произошла ошибка. Попробуйте еще раз.';
      }

      return data.response || 'Не удалось получить ответ от ИИ-помощника.';
    } catch (error) {
      console.error('Error in generateResponse:', error);
      return 'Произошла ошибка при обращении к ИИ-помощнику.';
    }
  };

  // Text-to-speech helper function
  const speakResponse = useCallback((text: string) => {
    if (!isVoiceMode) {
      console.log('Voice mode is disabled, skipping speech');
      return;
    }
    
    // Stop any current speech
    speechSynthesis.cancel();
    
    console.log('Starting speech synthesis for:', text.substring(0, 100) + '...');
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = voiceState.volume;
    utterance.lang = 'ru-RU';
    
    utterance.onstart = () => {
      console.log('Speech synthesis started');
      setVoiceState(prev => ({ ...prev, isSpeaking: true }));
    };
    
    utterance.onend = () => {
      console.log('Speech synthesis ended');
      setVoiceState(prev => ({ ...prev, isSpeaking: false }));
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setVoiceState(prev => ({ ...prev, isSpeaking: false }));
      toast({
        title: 'Ошибка голосового воспроизведения',
        description: 'Не удалось воспроизвести ответ голосом',
        variant: 'destructive'
      });
    };
    
    // Ensure voices are loaded
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) {
      // Wait for voices to load
      speechSynthesis.addEventListener('voiceschanged', () => {
        const russianVoice = speechSynthesis.getVoices().find(voice => 
          voice.lang.startsWith('ru') || voice.lang.includes('RU')
        );
        if (russianVoice) {
          utterance.voice = russianVoice;
        }
        speechSynthesis.speak(utterance);
      }, { once: true });
    } else {
      // Find Russian voice
      const russianVoice = voices.find(voice => 
        voice.lang.startsWith('ru') || voice.lang.includes('RU')
      );
      if (russianVoice) {
        utterance.voice = russianVoice;
        console.log('Using Russian voice:', russianVoice.name);
      } else {
        console.log('Russian voice not found, using default');
      }
      
      speechSynthesis.speak(utterance);
    }
  }, [isVoiceMode, voiceState.volume, toast]);

  // Cleanup function for stopping recording and releasing resources
  const cleanupRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Stop any ongoing speech synthesis
    speechSynthesis.cancel();
    
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setVoiceState(prev => ({ ...prev, isListening: false, isSpeaking: false }));
    setMessages(prev => prev.filter(m => m.content !== '🎤 Слушаю...'));
  }, []);

  // Process recorded audio and send to speech-to-text
  const processRecordedAudio = useCallback(async () => {
    console.log('Processing recorded audio...');
    
    if (audioChunksRef.current.length === 0) {
      console.warn('No audio data recorded');
      cleanupRecording();
      return;
    }
    
    try {
      // Convert audio to base64
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 in chunks to prevent memory issues
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
        const errorMessage = transcriptionError.message.includes('OpenAI') 
          ? 'Сервис распознавания речи временно недоступен. Попробуйте позже.'
          : 'Не удалось распознать речь. Проверьте качество записи и попробуйте еще раз.';
        addMessage('assistant', errorMessage);
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
          speakResponse(response);
        }
      } catch (error) {
        console.error('Error processing voice message:', error);
        setMessages(prev => prev.filter(m => m.id !== 'thinking'));
        
        const errorMessage = error.message.includes('OpenAI') 
          ? 'ИИ-помощник временно недоступен. Попробуйте позже.'
          : error.message.includes('network') || error.message.includes('fetch')
          ? 'Проблемы с сетью. Проверьте подключение к интернету.'
          : 'Извините, произошла ошибка при обработке команды. Попробуйте еще раз.';
        
        addMessage('assistant', errorMessage);
      }
      
    } catch (error) {
      console.error('Error processing audio:', error);
      setVoiceState(prev => ({ ...prev, isListening: false }));
      setMessages(prev => prev.filter(m => m.content !== '🎤 Слушаю...'));
      
      const errorMessage = error.message.includes('QuotaExceededError') 
        ? 'Превышен лимит размера аудиофайла. Запишите более короткое сообщение.'
        : error.message.includes('network') || error.message.includes('fetch')
        ? 'Ошибка сети при загрузке аудио. Проверьте подключение.'
        : 'Ошибка при обработке аудио. Попробуйте еще раз.';
      
      addMessage('assistant', errorMessage);
    }
  }, [addMessage, cleanupRecording, generateResponse, isVoiceMode]);

  // Start voice recording
  const startVoiceRecording = useCallback(async () => {
    // Prevent multiple recordings
    if (voiceState.isListening || mediaRecorderRef.current) {
      console.log('Recording already in progress');
      return;
    }

    // Stop any ongoing speech synthesis when starting to record
    speechSynthesis.cancel();
    setVoiceState(prev => ({ ...prev, isSpeaking: false }));

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
      
      streamRef.current = stream;
      setVoiceState(prev => ({ ...prev, isListening: true, isConnected: true }));
      addMessage('user', '🎤 Слушаю...', true);
      
      // Initialize MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm; codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        await processRecordedAudio();
      };
      
      mediaRecorder.start(1000); // Record in 1 second chunks
      console.log('MediaRecorder started');
      
    } catch (error) {
      console.error('Error starting voice recording:', error);
      cleanupRecording();
      toast({
        title: 'Ошибка доступа к микрофону',
        description: 'Разрешите доступ к микрофону для голосового ввода',
        variant: 'destructive'
      });
    }
  }, [voiceState.isListening, addMessage, toast, cleanupRecording, processRecordedAudio]);

  // Stop voice recording
  const stopVoiceRecording = useCallback(() => {
    console.log('Stopping voice recording...');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

  const toggleVoiceMode = useCallback(() => {
    const newVoiceMode = !isVoiceMode;
    setIsVoiceMode(newVoiceMode);
    
    if (newVoiceMode) {
      toast({
        title: 'Голосовой режим включен',
        description: 'Теперь помощник будет отвечать голосом'
      });
      
      // Test speech synthesis
      setTimeout(() => {
        if (newVoiceMode) { // Check again in case it was toggled quickly
          const utterance = new SpeechSynthesisUtterance('Голосовой режим включен. Я готов отвечать голосом!');
          utterance.rate = 0.9;
          utterance.pitch = 1;
          utterance.volume = voiceState.volume;
          utterance.lang = 'ru-RU';
          speechSynthesis.speak(utterance);
        }
      }, 500);
    } else {
      // Stop any ongoing speech when disabling voice mode
      speechSynthesis.cancel();
      setVoiceState(prev => ({ ...prev, isSpeaking: false }));
      
      toast({
        title: 'Голосовой режим выключен',
        description: 'Помощник будет отвечать только текстом'
      });
    }
  }, [isVoiceMode, toast, voiceState.volume]);

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
              {voiceState.isListening ? (
                <span className="text-green-500 flex items-center gap-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  Слушаю...
                </span>
              ) : voiceState.isSpeaking ? (
                <span className="text-blue-500 flex items-center gap-1">
                  <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                  Говорю...
                </span>
              ) : voiceState.isConnected ? (
                <span className="text-green-500">Готов к работе</span>
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
          {voiceState.isSpeaking && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                speechSynthesis.cancel();
                setVoiceState(prev => ({ ...prev, isSpeaking: false }));
              }}
              className="gap-1"
            >
              <VolumeX className="h-4 w-4" />
              Стоп
            </Button>
          )}
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
                  <div>
                    <div className="text-sm leading-relaxed">{message.content}</div>
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
                  </div>
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
              onClick={voiceState.isListening ? stopVoiceRecording : startVoiceRecording}
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
            Нажмите кнопку микрофона для начала/остановки записи голоса
          </p>
          
          {/* Command History */}
          {commandHistory.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Последние голосовые команды:</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {commandHistory.slice(0, 5).map((cmd: any) => (
                  <div key={cmd.id} className="text-xs text-muted-foreground p-2 bg-background rounded border-l-2 border-primary/20">
                    <span className="font-medium block">{cmd.transcript}</span>
                    <span className="text-xs opacity-60 block">
                      {new Date(cmd.created_at).toLocaleString('ru-RU')} • {cmd.status}
                    </span>
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