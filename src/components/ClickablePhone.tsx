import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Phone, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClickablePhoneProps {
  phone: string;
  messenger?: string;
  className?: string;
  showIcon?: boolean;
  variant?: 'default' | 'text';
}

export function ClickablePhone({ 
  phone, 
  messenger, 
  className, 
  showIcon = true, 
  variant = 'default' 
}: ClickablePhoneProps) {
  const cleanPhone = phone.replace(/\D/g, '');
  
  const handleCall = () => {
    window.open(`tel:${cleanPhone}`);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleTelegram = () => {
    window.open(`https://t.me/${cleanPhone}`, '_blank');
  };

  const handleViber = () => {
    window.open(`viber://chat?number=${cleanPhone}`, '_blank');
  };

  if (variant === 'text') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className={cn(
              "flex items-center gap-2 text-left hover:text-primary transition-colors cursor-pointer",
              className
            )}
          >
            {showIcon && <Phone className="h-4 w-4" />}
            <span>{phone}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={handleCall}>
            <Phone className="h-4 w-4 mr-2" />
            Позвонить
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleWhatsApp}>
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleTelegram}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Telegram
          </DropdownMenuItem>
          {messenger === 'viber' && (
            <DropdownMenuItem onClick={handleViber}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Viber
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Phone className="h-4 w-4 mr-2" />
          Связаться
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={handleCall}>
          <Phone className="h-4 w-4 mr-2" />
          Позвонить
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTelegram}>
          <MessageCircle className="h-4 w-4 mr-2" />
          Telegram
        </DropdownMenuItem>
        {messenger === 'viber' && (
          <DropdownMenuItem onClick={handleViber}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Viber
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}