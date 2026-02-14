import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { oneSignalService } from '@/services/oneSignalService';
import { toast } from 'sonner';

export default function TestNotificationsPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState('Teste de Notificação');
  const [message, setMessage] = useState('Esta é uma notificação de teste');
  const [targetUserId, setTargetUserId] = useState(user?.id || '');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const checkSubscriptionStatus = async () => {
    try {
      const isSubscribed = await oneSignalService.isSubscribed();
      const playerId = await oneSignalService.getPlayerId();
      
      // Get more detailed info
      const info: any = {
        isSubscribed,
        playerId,
        userId: user?.id,
        timestamp: new Date().toISOString(),
      };

      // Try to get OneSignal user info
      if ((window as any).OneSignal) {
        const OneSignal = (window as any).OneSignal;
        try {
          info.externalId = await OneSignal.User.externalId;
          info.pushSubscriptionId = await OneSignal.User.PushSubscription.id;
          info.pushToken = await OneSignal.User.PushSubscription.token;
          info.optedIn = await OneSignal.User.PushSubscription.optedIn;
        } catch (e) {
          info.error = String(e);
        }
      }

      setDebugInfo(info);
      toast.success('Status verificado - veja os detalhes abaixo');
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast.error('Erro ao verificar status');
    }
  };

  const requestPermission = async () => {
    try {
      setLoading(true);
      const granted = await oneSignalService.requestPermission();
      
      if (granted) {
        toast.success('Permissão concedida!');
        await checkSubscriptionStatus();
      } else {
        toast.error('Permissão negada');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Erro ao solicitar permissão');
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!targetUserId) {
      toast.error('Por favor, informe o ID do usuário');
      return;
    }

    try {
      setLoading(true);
      await oneSignalService.sendNotificationToUser(targetUserId, {
        title,
        message,
        url: window.location.origin,
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        },
      });
      toast.success('Notificação enviada com sucesso!');
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast.error(`Erro ao enviar notificação: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teste de Notificações Push</h1>
        <p className="text-muted-foreground">
          Use esta página para testar e debugar notificações OneSignal
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status da Inscrição</CardTitle>
            <CardDescription>
              Verifique o status da sua inscrição OneSignal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={checkSubscriptionStatus} className="w-full">
              Verificar Status
            </Button>
            <Button onClick={requestPermission} disabled={loading} className="w-full" variant="outline">
              Solicitar Permissão
            </Button>
            
            {debugInfo && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Informações de Debug:</h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enviar Notificação de Teste</CardTitle>
            <CardDescription>
              Envie uma notificação para testar o fluxo completo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">ID do Usuário (External ID)</Label>
              <Input
                id="userId"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="UUID do usuário"
              />
              <p className="text-xs text-muted-foreground">
                Seu ID: {user?.id}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={sendTestNotification} 
              disabled={loading || !targetUserId}
              className="w-full"
            >
              {loading ? 'Enviando...' : 'Enviar Notificação'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instruções de Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Primeiro, verifique o status da inscrição clicando em "Verificar Status"</li>
            <li>Se não estiver inscrito, clique em "Solicitar Permissão"</li>
            <li>Verifique no console do navegador se há erros do OneSignal</li>
            <li>Copie o "External ID" das informações de debug</li>
            <li>Cole o External ID no campo "ID do Usuário" e envie uma notificação de teste</li>
            <li>Verifique no dashboard do OneSignal se a notificação foi enviada</li>
            <li>Verifique nos logs da Edge Function se há erros</li>
          </ol>
          
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <h4 className="font-semibold mb-2">⚠️ Pontos de Atenção:</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>O External ID deve corresponder ao user.id do Supabase</li>
              <li>O usuário deve ter concedido permissão para notificações</li>
              <li>O Service Worker deve estar registrado corretamente</li>
              <li>A API Key do OneSignal deve estar configurada no Supabase</li>
              <li>O navegador deve suportar notificações push</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
