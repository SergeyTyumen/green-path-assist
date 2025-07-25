import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Send, Volume2, VolumeX, Settings } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useConversation } from "@11labs/react";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

const VoiceAssistant = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Привет! Я ваш голосовой помощник для CRM. Могу говорить голосом или отвечать текстом. Чем помочь?',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('elevenlabs_api_key') || '');
  const [showSettings, setShowSettings] = useState(!apiKey);
  const [agentId, setAgentId] = useState(localStorage.getItem('elevenlabs_agent_id') || '');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');
      setIsListening(true);
      toast({
        title: "Голосовой режим активен",
        description: "Теперь говорите с помощником непрерывно",
      });
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
      setIsListening(false);
      setIsVoiceMode(false);
      setIsSpeaking(false);
    },
    onMessage: (message) => {
      console.log('Message received:', message);
      
      // Обработка голосовых команд для переключения в текстовый режим
      if (message.message && 
          (message.message.toLowerCase().includes('отвечай в текст') || 
           message.message.toLowerCase().includes('текстовый режим'))) {
        setIsVoiceMode(false);
        conversation.endSession();
        addMessage('assistant', 'Переключился в текстовый режим. Теперь буду отвечать только текстом.');
        return;
      }
      
      // Добавляем сообщение от помощника
      if (message.message) {
        addMessage('assistant', message.message, true);
      }
    },
    onError: (error) => {
      console.error('Conversation error:', error);
      toast({
        title: "Ошибка голосового режима",
        description: "Проверьте API ключ и настройки",
        variant: "destructive"
      });
      setIsVoiceMode(false);
      setIsListening(false);
      setIsSpeaking(false);
    }
  });

  // Отслеживание состояния говорения
  useEffect(() => {
    if (conversation.isSpeaking !== undefined) {
      setIsSpeaking(conversation.isSpeaking);
    }
  }, [conversation.isSpeaking]);

  const addMessage = (type: 'user' | 'assistant', content: string, isVoice = false) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      isVoice
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    addMessage('user', inputMessage);
    const userMessage = inputMessage;
    setInputMessage('');
    
    // Простая обработка команд
    setTimeout(() => {
      handleCommand(userMessage);
    }, 500);
  };

  const handleCommand = (message: string) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('отвечай в текст') || lowerMessage.includes('текстовый режим')) {
      setIsVoiceMode(false);
      if (conversation.status === 'connected') {
        conversation.endSession();
      }
      addMessage('assistant', 'Переключился в текстовый режим. Теперь буду отвечать только текстом.');
      return;
    }
    
    if (lowerMessage.includes('клиент') && lowerMessage.includes('иванов')) {
      addMessage('assistant', 'Клиент Иванов находится на этапе "Предложение отправлено". Последний контакт: 2 дня назад. Проект: ландшафтный дизайн участка 8 соток, бюджет 450,000 руб.');
      return;
    }
    
    if (lowerMessage.includes('щебень') && lowerMessage.includes('поставщик')) {
      addMessage('assistant', 'Щебень поставляет ООО "СтройМатериалы Плюс". Цена: 2,200 руб/м³. Последняя поставка: 15.01.2024. Качество: отличное, работаем уже 2 года.');
      return;
    }
    
    if (lowerMessage.includes('дорнит') && lowerMessage.includes('цена')) {
      addMessage('assistant', 'Последняя закупка дорнита: 185 руб/м² у ООО "ГеоТекстиль". Закупка от 18.01.2024, объем 250 м². Текущий остаток на складе: 45 м².');
      return;
    }
    
    if (lowerMessage.includes('кп') || lowerMessage.includes('коммерческое предложение')) {
      addMessage('assistant', 'Формирую коммерческое предложение на газон и автополив для участка 6 соток...\n\nОсновные позиции:\n• Планировка и подготовка: 95,000 руб\n• Рулонный газон: 180,000 руб\n• Система автополива: 165,000 руб\n• Материалы и работы: 75,000 руб\n\nИтого: 515,000 руб\n\nПередаю задачу ИИ-помощнику для детальной проработки.');
      return;
    }
    
    // Общий ответ
    addMessage('assistant', `Понял ваш запрос: "${message}". Обрабатываю информацию и анализирую данные CRM...`);
  };

  const toggleVoiceMode = async () => {
    if (!apiKey || !agentId) {
      setShowSettings(true);
      toast({
        title: "Настройки не заполнены",
        description: "Введите API ключ и ID агента ElevenLabs",
        variant: "destructive"
      });
      return;
    }

    if (isVoiceMode && conversation.status === 'connected') {
      await conversation.endSession();
      setIsVoiceMode(false);
    } else {
      try {
        // Запрос доступа к микрофону
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Подключаемся с agentId
        await conversation.startSession({ 
          agentId: agentId
        });
        setIsVoiceMode(true);
      } catch (error) {
        console.error('Voice mode error:', error);
        toast({
          title: "Ошибка доступа к микрофону",
          description: "Разрешите доступ к микрофону в браузере",
          variant: "destructive"
        });
      }
    }
  };

  const saveSettings = () => {
    if (apiKey) {
      localStorage.setItem('elevenlabs_api_key', apiKey);
      localStorage.setItem('elevenlabs_agent_id', agentId);
      setShowSettings(false);
      toast({
        title: "Настройки сохранены",
        description: "Теперь можно использовать голосовой режим",
      });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Голосовой помощник руководителя</h1>
        <p className="text-muted-foreground">
          Управляйте CRM голосом или текстом. Получайте информацию о клиентах, создавайте документы, делегируйте задачи.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Настройки */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Настройки
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">ElevenLabs API Key</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Agent ID</label>
                <Input
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="agent_..."
                />
              </div>
              <Button onClick={saveSettings} size="sm" className="w-full">
                Сохранить
              </Button>
              
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Статус:</span>
                  <Badge variant={conversation.status === 'connected' ? 'default' : 'secondary'}>
                    {conversation.status === 'connected' ? 'Подключен' : 'Отключен'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Режим:</span>
                  <Badge variant={isVoiceMode ? 'default' : 'outline'}>
                    {isVoiceMode ? 'Голосовой' : 'Текстовый'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Чат */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Диалог с помощником</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant={isVoiceMode ? "default" : "outline"}
                    size="sm"
                    onClick={toggleVoiceMode}
                    disabled={!apiKey || !agentId}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {isVoiceMode ? 'Отключить голос' : 'Включить голос'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {message.isVoice && (
                            <Volume2 className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              <div className="pt-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Введите сообщение или используйте голосовой режим..."
                    disabled={isVoiceMode}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isVoiceMode}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Голосовой режим - центральный индикатор как в ChatGPT */}
                {isVoiceMode && (
                  <div className="mt-4 flex flex-col items-center space-y-3">
                    <div className="relative">
                      {/* Центральный круг с анимацией */}
                      <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
                        isSpeaking 
                          ? 'border-emerald-400 bg-emerald-50 animate-pulse' 
                          : isListening 
                            ? 'border-blue-400 bg-blue-50 animate-pulse' 
                            : 'border-gray-300 bg-gray-50'
                      }`}>
                        {isSpeaking ? (
                          <Volume2 className="w-8 h-8 text-emerald-600" />
                        ) : isListening ? (
                          <Mic className="w-8 h-8 text-blue-600" />
                        ) : (
                          <MicOff className="w-8 h-8 text-gray-500" />
                        )}
                      </div>
                      
                      {/* Внешние кольца анимации */}
                      {(isListening || isSpeaking) && (
                        <>
                          <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-current opacity-30 animate-ping" style={{
                            color: isSpeaking ? '#10b981' : '#3b82f6'
                          }} />
                          <div className="absolute -inset-2 w-24 h-24 rounded-full border border-current opacity-20 animate-ping" style={{
                            animationDelay: '0.5s',
                            color: isSpeaking ? '#10b981' : '#3b82f6'
                          }} />
                        </>
                      )}
                    </div>
                    
                    {/* Статус текст */}
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {isSpeaking ? 'Помощник говорит...' : isListening ? 'Слушаю вас...' : 'Ожидание'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Скажите "отвечай текстом" для выхода из голосового режима
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;