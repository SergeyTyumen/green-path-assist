import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit, Mail, Phone, MessageCircle, User, Building, Key } from 'lucide-react';
import { UserProfileDialog } from '@/components/UserProfileDialog';
import { useProfiles } from '@/hooks/useProfiles';
import { useNavigate } from 'react-router-dom';

export default function UserProfile() {
  const { profiles, currentProfile, loading } = useProfiles();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Профили пользователей</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/reset-password')}>
            <Key className="h-4 w-4 mr-2" />
            Сменить пароль
          </Button>
          <Button onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Редактировать мой профиль
          </Button>
        </div>
      </div>

      {/* Мой профиль */}
      <Card>
        <CardHeader>
          <CardTitle>Мой профиль</CardTitle>
        </CardHeader>
        <CardContent>
          {currentProfile ? (
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={currentProfile.avatar_url || undefined} />
                <AvatarFallback>
                  {currentProfile.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div>
                  <h3 className="text-xl font-semibold">{currentProfile.full_name || 'Имя не указано'}</h3>
                  {currentProfile.position && (
                    <p className="text-muted-foreground">{currentProfile.position}</p>
                  )}
                  {currentProfile.department && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Building className="h-4 w-4" />
                      {currentProfile.department}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  {currentProfile.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {currentProfile.email}
                    </div>
                  )}
                  {currentProfile.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {currentProfile.phone}
                    </div>
                  )}
                  {currentProfile.telegram_username && (
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      Telegram: {currentProfile.telegram_username}
                    </div>
                  )}
                  {currentProfile.whatsapp_phone && (
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp: {currentProfile.whatsapp_phone}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Профиль не создан</p>
              <Button onClick={() => setEditDialogOpen(true)}>
                Создать профиль
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Все профили */}
      <Card>
        <CardHeader>
          <CardTitle>Все сотрудники</CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((profile) => (
                <Card key={profile.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>
                        {profile.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">
                        {profile.full_name || 'Имя не указано'}
                      </h4>
                      {profile.position && (
                        <p className="text-sm text-muted-foreground truncate">
                          {profile.position}
                        </p>
                      )}
                      {profile.department && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {profile.department}
                        </Badge>
                      )}
                      
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {profile.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{profile.email}</span>
                          </div>
                        )}
                        {profile.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{profile.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Профили сотрудников не найдены
            </div>
          )}
        </CardContent>
      </Card>

      <UserProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
}