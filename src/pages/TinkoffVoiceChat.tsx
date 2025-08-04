/**
 * Tinkoff VoiceKit Chat Page
 * Страница для демонстрации работы с Tinkoff VoiceKit
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { 
  Bot,
  User,
  Send,
  Settings,
  Info,
  Zap
} from 'lucide-react';
import TinkoffVoiceAssistantComponent from '@/components/TinkoffVoiceAssistant';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

const TinkoffVoiceChat = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: 'Добро пожаловать в демонстрацию Tinkoff VoiceKit! Этот ассистент использует российские технологии распознавания и синтеза речи.',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');

  // Добавление сообщения
  const addMessage = useCallback((type: 'user' | 'assistant' | 'system', content: string, isVoice = false) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      isVoice
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  // Обработка распознанной речи
  const handleSpeechRecognized = useCallback((text: string) => {
    addMessage('user', text, true);
    
    // Здесь можно добавить логику обработки команд CRM
    setTimeout(() => {
      const response = generateCRMResponse(text);
      addMessage('assistant', response);
    }, 1000);
  }, [addMessage]);

  // Генерация ответа CRM (заглушка)
  const generateCRMResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('клиент') || input.includes('клиенты')) {
      return 'В системе зарегистрировано 247 активных клиентов. Хотите посмотреть список последних добавленных клиентов?';
    }
    
    if (input.includes('смета') || input.includes('сметы')) {
      return 'Найдено 15 активных смет на общую сумму 2,4 млн рублей. Показать детали по самым крупным сметам?';
    }
    
    if (input.includes('задач') || input.includes('задачи')) {
      return 'У вас 8 незавершенных задач. 3 из них просрочены. Хотите просмотреть список приоритетных задач?';
    }
    
    if (input.includes('продаж') || input.includes('продажи') || input.includes('отчет')) {
      return 'За текущий месяц выполнено 85% плана продаж. Общая выручка составила 1,2 млн рублей. Показать подробную аналитику?';
    }
    
    if (input.includes('подрядчик') || input.includes('подрядчики')) {
      return 'В базе 23 проверенных подрядчика. 12 из них доступны для новых проектов. Хотите посмотреть рейтинг подрядчиков?';
    }
    
    return `Команда "${userInput}" принята к обработке. В реальной системе здесь будет интеграция с модулями CRM для выполнения соответствующих действий.`;
  };

  // Обработка текстового ввода
  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    addMessage('user', userMessage);
    
    setTimeout(() => {
      const response = generateCRMResponse(userMessage);
      addMessage('assistant', response);
    }, 1000);
  }, [inputValue, addMessage]);

  // Обработка ошибок ассистента
  const handleAssistantError = useCallback((error: Error) => {
    console.error('Voice Assistant Error:', error);
    
    addMessage('system', `Ошибка голосового ассистента: ${error.message}`, false);
    
    toast({
      title: 'Ошибка VoiceKit',
      description: error.message,
      variant: 'destructive'
    });
  }, [addMessage, toast]);

  return (
    <div className="h-full flex gap-6 p-6">
      {/* Основная область чата */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Tinkoff VoiceKit CRM Assistant
            </CardTitle>
            <CardDescription>
              Голосовой помощник на базе технологий Тинькофф для управления CRM системой
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col gap-4">
            {/* Сообщения */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.type !== 'user' && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground ml-12'
                          : message.type === 'system'
                          ? 'bg-muted border'
                          : 'bg-card border shadow-sm'
                      }`}
                    >
                      <div className="text-sm leading-relaxed">{message.content}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString('ru-RU', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {message.isVoice && (
                          <Badge variant="secondary" className="text-xs">
                            Голос
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {message.type === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <Separator />
            
            {/* Ввод сообщения */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Напишите вопрос о клиентах, сметах, задачах..."
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
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Боковая панель с голосовым ассистентом */}
      <div className="w-80 flex flex-col gap-4">
        {/* Голосовой ассистент */}
        <TinkoffVoiceAssistantComponent
          onSpeechRecognized={handleSpeechRecognized}
          onResponseGenerated={(response) => {
            console.log('Response generated:', response);
          }}
          onError={handleAssistantError}
        />
        
        {/* Информационная карта */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" />
              О Tinkoff VoiceKit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Российская разработка</div>
                <div className="text-muted-foreground">
                  Использует технологии Тинькофф для STT и TTS
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Settings className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Непрерывный режим</div>
                <div className="text-muted-foreground">
                  Voice Activity Detection для автоматического распознавания речи
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Bot className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Интеграция с CRM</div>
                <div className="text-muted-foreground">
                  Голосовые команды для управления клиентами, сметами и задачами
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Быстрые команды */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Примеры команд</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              'Покажи список клиентов',
              'Сколько активных смет?',
              'Какие задачи на сегодня?',
              'Отчет по продажам',
              'Список подрядчиков'
            ].map((command, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8"
                onClick={() => {
                  setInputValue(command);
                  setTimeout(handleSendMessage, 100);
                }}
              >
                {command}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TinkoffVoiceChat;