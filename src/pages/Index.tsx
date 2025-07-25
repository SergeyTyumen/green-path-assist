import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Добро пожаловать, {user?.email}!</h1>
        <p className="text-xl text-muted-foreground">CRM система для ландшафтного бизнеса</p>
      </div>
    </div>
  );
};

export default Index;
