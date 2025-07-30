import { VoiceAssistantSettings as SettingsComponent } from "@/components/VoiceAssistantSettings";

export default function VoiceAssistantSettings() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Настройки голосового помощника</h1>
        <p className="text-muted-foreground mt-2">
          Настройте модель ИИ, режим взаимодействия и параметры голосового синтеза
        </p>
      </div>
      <SettingsComponent />
    </div>
  );
}