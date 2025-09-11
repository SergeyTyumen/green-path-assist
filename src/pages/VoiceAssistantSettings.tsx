import { VoiceAssistantSettings as SettingsComponent } from "@/components/VoiceAssistantSettings";

export default function VoiceAssistantSettings() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Настройки голосового помощника</h1>
        <p className="text-muted-foreground mt-2">
          Настройте модель ИИ, режим взаимодействия и параметры голосового синтеза
        </p>
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Статус интеграции:</strong> Настройки готовы! Перейдите на страницу{" "}
            <a href="/voice-assistant" className="text-amber-900 underline font-medium">
              Голосовой помощник
            </a>{" "}
            для тестирования новых возможностей.
          </p>
        </div>
      </div>
      <SettingsComponent />
    </div>
  );
}