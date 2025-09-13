import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send } from "lucide-react";
import { Link } from "react-router-dom";

export function RegistrationRequest() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_registration_requests')
        .insert({
          email: email.trim(),
          full_name: fullName.trim(),
          message: message.trim() || null
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Заявка уже существует",
            description: "Заявка с таким email уже подана. Ожидайте рассмотрения.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        // Отправляем уведомление администраторам
        try {
          await supabase.functions.invoke('notify-admin', {
            body: {
              type: 'new_registration_request',
              data: {
                full_name: fullName.trim(),
                email: email.trim(),
                message: message.trim() || null
              }
            }
          });
        } catch (notifyError) {
          console.error('Failed to notify admins:', notifyError);
          // Не блокируем процесс, если уведомление не отправилось
        }

        setSubmitted(true);
        toast({
          title: "Заявка отправлена",
          description: "Ваша заявка на регистрацию отправлена администратору на рассмотрение.",
        });
      }
    } catch (error: any) {
      console.error('Error submitting registration request:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заявку. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-green-600">Заявка отправлена</CardTitle>
            <CardDescription>
              Ваша заявка на регистрацию получена
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Send className="h-4 w-4" />
              <AlertDescription>
                Администратор рассмотрит вашу заявку в ближайшее время. 
                Вы получите уведомление на указанную почту о статусе заявки.
              </AlertDescription>
            </Alert>
            
            <div className="text-center">
              <Link to="/auth">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Вернуться к входу
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Заявка на регистрацию</CardTitle>
          <CardDescription>
            Заполните форму для получения доступа к системе
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Полное имя *</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Иван Иванов"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ivan@company.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Сообщение (необязательно)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Укажите ваш отдел, должность или причину запроса доступа..."
                rows={3}
              />
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                После отправки заявки администратор рассмотрит ваш запрос. 
                Вы получите уведомление на email о статусе заявки.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Отправка..." : "Отправить заявку"}
              </Button>
              
              <Link to="/auth" className="block">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Вернуться к входу
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}