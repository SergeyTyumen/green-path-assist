import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Ошибка",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setEmailSent(true);
        toast({
          title: "Письмо отправлено",
          description: "Проверьте вашу почту для восстановления пароля",
        });
      }
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить письмо для восстановления пароля",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-green-600">Письмо отправлено</CardTitle>
            <CardDescription>
              Инструкции по восстановлению пароля отправлены на вашу почту
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Мы отправили ссылку для восстановления пароля на {email}. 
                Перейдите по ссылке в письме, чтобы установить новый пароль.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Не получили письмо? Проверьте папку "Спам"
              </p>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                  className="flex-1"
                >
                  Попробовать снова
                </Button>
                
                <Link to="/auth" className="flex-1">
                  <Button variant="default" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Вернуться к входу
                  </Button>
                </Link>
              </div>
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
          <CardTitle>Восстановление пароля</CardTitle>
          <CardDescription>
            Введите ваш email для получения ссылки восстановления
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email адрес</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ivan@company.com"
                required
              />
            </div>

            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Мы отправим ссылку для восстановления пароля на указанный email адрес.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Отправка..." : "Отправить ссылку"}
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