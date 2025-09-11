import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Device } from '@capacitor/device';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationSettings {
  enabled: boolean;
  taskReminders: boolean;
  overdueAlerts: boolean;
  newTaskAlerts: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  taskReminders: true,
  overdueAlerts: true,
  newTaskAlerts: true,
  soundEnabled: true,
  vibrationEnabled: true,
};

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Инициализация уведомлений
  useEffect(() => {
    const initNotifications = async () => {
      if (!Capacitor.isNativePlatform()) {
        setIsSupported(false);
        setLoading(false);
        return;
      }

      setIsSupported(true);
      
      // Загружаем настройки из localStorage
      const savedSettings = localStorage.getItem('notificationSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      // Запрашиваем разрешения
      await requestPermissions();
      
      // Настраиваем слушатели уведомлений
      setupNotificationListeners();
      
      setLoading(false);
    };

    initNotifications();
  }, []);

  const requestPermissions = async () => {
    try {
      // Запрос разрешений для push-уведомлений
      const pushPermissions = await PushNotifications.requestPermissions();
      
      if (pushPermissions.receive === 'granted') {
        await PushNotifications.register();
      }

      // Запрос разрешений для локальных уведомлений
      const localPermissions = await LocalNotifications.requestPermissions();
      
      return pushPermissions.receive === 'granted' && localPermissions.display === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  const setupNotificationListeners = () => {
    // Обработка регистрации push-уведомлений
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success:', token.value);
      // Сохраняем токен в базе данных для отправки уведомлений
      if (user) {
        savePushToken(token.value);
      }
    });

    // Обработка ошибок регистрации
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
    });

    // Обработка полученных push-уведомлений
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
    });

    // Обработка действий с уведомлениями
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push notification action performed:', notification);
      // Можно добавить навигацию к соответствующей задаче
    });

    // Обработка локальных уведомлений
    LocalNotifications.addListener('localNotificationReceived', (notification: LocalNotificationSchema) => {
      console.log('Local notification received:', notification);
    });

    LocalNotifications.addListener('localNotificationActionPerformed', (notification: any) => {
      console.log('Local notification action performed:', notification);
    });
  };

  const savePushToken = async (token: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: user.id,
          token,
          device_info: await Device.getInfo(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(updatedSettings));
    
    // Если уведомления выключены, отменяем все запланированные
    if (!updatedSettings.enabled) {
      await LocalNotifications.cancel({ notifications: [] });
    }

    toast.success('Настройки уведомлений обновлены');
  };

  // Планирование локального уведомления для задачи
  const scheduleTaskNotification = async (task: any) => {
    if (!isSupported || !settings.enabled) return;

    try {
      const notificationId = parseInt(task.id.replace(/-/g, '').substring(0, 8), 16);
      
      // Уведомление за час до дедлайна
      if (task.due_date && settings.taskReminders) {
        const dueDate = new Date(task.due_date);
        const reminderTime = new Date(dueDate.getTime() - 60 * 60 * 1000); // За час
        
        if (reminderTime > new Date()) {
          await LocalNotifications.schedule({
            notifications: [
              {
                title: 'Напоминание о задаче',
                body: `Задача "${task.title}" должна быть выполнена через час`,
                id: notificationId,
                schedule: { at: reminderTime },
                sound: settings.soundEnabled ? 'default' : undefined,
                extra: {
                  taskId: task.id,
                  type: 'reminder'
                }
              }
            ]
          });
        }
      }

      // Уведомление о просроченной задаче
      if (task.due_date && settings.overdueAlerts && task.status !== 'completed') {
        const dueDate = new Date(task.due_date);
        const overdueTime = new Date(dueDate.getTime() + 24 * 60 * 60 * 1000); // Через день после дедлайна
        
        await LocalNotifications.schedule({
          notifications: [
            {
              title: 'Просроченная задача',
              body: `Задача "${task.title}" просрочена`,
              id: notificationId + 1000,
              schedule: { at: overdueTime },
              sound: settings.soundEnabled ? 'default' : undefined,
              extra: {
                taskId: task.id,
                type: 'overdue'
              }
            }
          ]
        });
      }

    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  // Уведомление о новой задаче
  const notifyNewTask = async (task: any) => {
    if (!isSupported || !settings.enabled || !settings.newTaskAlerts) return;

    try {
      const notificationId = parseInt(task.id.replace(/-/g, '').substring(0, 8), 16) + 2000;
      
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Новая задача',
            body: `Создана новая задача: "${task.title}"`,
            id: notificationId,
            schedule: { at: new Date(Date.now() + 1000) }, // Через секунду
            sound: settings.soundEnabled ? 'default' : undefined,
            extra: {
              taskId: task.id,
              type: 'new_task'
            }
          }
        ]
      });
    } catch (error) {
      console.error('Error sending new task notification:', error);
    }
  };

  // Отмена уведомлений для задачи
  const cancelTaskNotifications = async (taskId: string) => {
    if (!isSupported) return;

    try {
      const notificationId = parseInt(taskId.replace(/-/g, '').substring(0, 8), 16);
      
      await LocalNotifications.cancel({
        notifications: [
          { id: notificationId },
          { id: notificationId + 1000 },
          { id: notificationId + 2000 }
        ]
      });
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  };

  return {
    isSupported,
    settings,
    loading,
    updateSettings,
    scheduleTaskNotification,
    notifyNewTask,
    cancelTaskNotifications,
    requestPermissions
  };
}