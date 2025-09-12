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
  Trash2,
  AlertCircle
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
    isConnected: false
  });
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [browserSupport, setBrowserSupport] = useState({
    mediaDevices: false,
    speechSynthesis: false,
    mediaRecorder: false
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check browser capabilities
  useEffect(() => {
    const checkBrowserSupport = () => {
      const hasWebkitSpeech = !!(window as any).webkitSpeechRecognition;
      const hasSpeechRecognition = !!(window as any).SpeechRecognition;
      
      setBrowserSupport({
        mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        speechSynthesis: !!window.speechSynthesis,
        mediaRecorder: !!window.MediaRecorder && (hasWebkitSpeech || hasSpeechRecognition)
      });
    };
    
    checkBrowserSupport();
  }, []);

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

  // Toggle voice mode
  const toggleVoiceMode = () => {
    const newMode = !isVoiceMode;
    setIsVoiceMode(newMode);
    
    if (newMode) {
      toast({
        title: 'Голосовой режим включен',
        description: 'Теперь помощник будет отвечать голосом'
      });
    } else {
      // Stop any current speech
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      setVoiceState(prev => ({ ...prev, isSpeaking: false }));
    }
  };

  // Clear chat
  const clearChat = () => {
    setMessages([{
      id: '1',
      type: 'assistant',
      content: 'Чат очищен. Как могу помочь?',
      timestamp: new Date(),
    }]);
  };

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
      if (isVoiceMode && browserSupport.speechSynthesis) {
        speakResponse(response);
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== 'thinking'));
      addMessage('assistant', 'Извините, произошла ошибка. Попробуйте еще раз.');
    }
  }, [inputValue, addMessage, isVoiceMode, browserSupport.speechSynthesis]);

  // Generate AI response using edge function directly
  const generateResponse = async (userMessage: string): Promise<string> => {
    try {
      console.log('Calling enhanced-voice-chat edge function...');
      
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
        console.error('Edge function error:', error);
        throw error;
      }
      
      console.log('Response from edge function:', data);
      return data?.response || 'Ответ получен от голосового помощника';
      
    } catch (error) {
      console.error('Error calling enhanced-voice-chat:', error);
      return 'Извините, произошла ошибка при обработке запроса. Проверьте настройки API или попробуйте позже.';
    }
  };

  // Text-to-speech helper function
  const speakResponse = (text: string) => {
    if (!isVoiceMode || !browserSupport.speechSynthesis) return;
    
    // Stop any current speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    utterance.lang = 'ru-RU';
    
    utterance.onstart = () => {
      setVoiceState(prev => ({ ...prev, isSpeaking: true }));
    };
    
    utterance.onend = () => {
      setVoiceState(prev => ({ ...prev, isSpeaking: false }));
    };
    
    speechSynthesis.speak(utterance);
  };

  // Voice input implementation
  const handleVoiceInput = async () => {
    if (!browserSupport.mediaDevices) {
      toast({
        title: 'Голосовой ввод недоступен',
        description: 'Ваш браузер не поддерживает доступ к микрофону. Попробуйте Chrome, Firefox или Safari.',
        variant: 'destructive'
      });
      return;
    }

    if (voiceState.isListening) {
      // Stop listening
      setVoiceState(prev => ({ ...prev, isListening: false }));
      toast({
        title: 'Запись остановлена',
        description: 'Голосовой ввод завершен'
      });
      return;
    }

    try {
      // Start listening
      setVoiceState(prev => ({ ...prev, isListening: true }));
      
      const recognition = new (window as any).webkitSpeechRecognition() || new (window as any).SpeechRecognition();
      recognition.lang = 'ru-RU';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setVoiceState(prev => ({ ...prev, isListening: false }));
        
        toast({
          title: 'Голос распознан',
          description: `Текст: "${transcript}"`
        });
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setVoiceState(prev => ({ ...prev, isListening: false }));
        
        toast({
          title: 'Ошибка распознавания',
          description: 'Не удалось распознать речь. Попробуйте еще раз.',
          variant: 'destructive'
        });
      };

      recognition.onend = () => {
        setVoiceState(prev => ({ ...prev, isListening: false }));
      };

      recognition.start();
      
      toast({
        title: 'Слушаю...',
        description: 'Говорите четко и медленно'
      });

    } catch (error) {
      console.error('Error starting voice input:', error);
      setVoiceState(prev => ({ ...prev, isListening: false }));
      
      toast({
        title: 'Ошибка голосового ввода',
        description: 'Голосовое распознавание не поддерживается в этом браузере',
        variant: 'destructive'
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Голосовой помощник</h1>
              <div className="text-sm text-muted-foreground">
                {voiceState.isSpeaking ? (
                  <span className="text-green-500">Говорю...</span>
                ) : voiceState.isListening ? (
                  <span className="text-blue-500">Слушаю...</span>
                ) : voiceState.isConnected ? (
                  <span className="text-green-500">Готов к работе</span>
                ) : (
                  'Управление CRM через голос и текст'
                )}
              </div>
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
      </div>

      {/* Browser support warning */}
      {(!browserSupport.mediaDevices || !browserSupport.speechSynthesis) && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-3">
          <div className="max-w-4xl mx-auto flex items-center gap-2 text-yellow-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">
              Ограниченная поддержка браузера. Некоторые голосовые функции могут не работать.
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div key={message.id} className="flex items-start gap-3">
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                message.type === 'assistant' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {message.type === 'assistant' ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {message.type === 'assistant' ? 'Ассистент' : 'Вы'}
                  </span>
                  {message.isVoice && (
                    <Badge variant="secondary" className="text-xs">
                      Голос
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                {message.thinking ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm text-muted-foreground">Думаю...</span>
                  </div>
                ) : (
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Введите сообщение или вопрос о CRM..."
                className="min-h-[44px]"
              />
            </div>
            <Button
              onClick={handleVoiceInput}
              variant="outline"
              size="icon"
              className={cn(
                "w-11 h-11",
                voiceState.isListening && "bg-red-500 text-white hover:bg-red-600"
              )}
              disabled={!browserSupport.mediaDevices}
            >
              {voiceState.isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              size="icon"
              className="w-11 h-11"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Quick action buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Покажи мои задачи")}
              className="text-xs"
            >
              Мои задачи
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Какие клиенты в работе?")}
              className="text-xs"
            >
              Клиенты в работе
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Создай смету на газон 100 кв.м")}
              className="text-xs"
            >
              Создать смету
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Создай задачу: связаться с клиентом")}
              className="text-xs"
            >
              Создать задачу
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Проанализируй воронку продаж")}
              className="text-xs"
            >
              Анализ продаж
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Составь смету на дренаж 50 метров для клиента Иванова")}
              className="text-xs"
            >
              Смета с клиентом
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceChatAssistant;