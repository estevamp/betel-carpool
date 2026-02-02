import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCongregationAdmins } from '@/hooks/useCongregationAdmins';
import { useBetelitas } from '@/hooks/useBetelitas';
import { Congregation } from '@/hooks/useCongregations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ManageAdminsDialogProps {
  congregation: Congregation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageAdminsDialog = ({ congregation, open, onOpenChange }: ManageAdminsDialogProps) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const { admins, isLoading, addAdmin, removeAdmin } = useCongregationAdmins(congregation?.id);
  // Buscar apenas betelitas da congregação selecionada
  const { data: betelitas } = useBetelitas({ congregationId: congregation?.id });

  const handleAddAdmin = async () => {
    if (!selectedProfileId || !congregation) return;
    
    await addAdmin.mutateAsync({
      profileId: selectedProfileId,
      congregationId: congregation.id,
    });
    setSelectedProfileId('');
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (confirm('Tem certeza que deseja remover este administrador?')) {
      await removeAdmin.mutateAsync(adminId);
    }
  };

  // Filtrar betelitas que já não são administradores desta congregação
  const availableBetelitas = betelitas?.filter(
    (b) => !admins?.some((a) => a.profile_id === b.id) && b.congregation_id === congregation?.id
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Gerenciar Administradores - {congregation?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Adicionar novo administrador */}
          <div className="space-y-2">
            <Label>Adicionar Administrador</Label>
            <div className="flex gap-2">
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um betelita" />
                </SelectTrigger>
                <SelectContent>
                  {availableBetelitas?.map((betelita) => (
                    <SelectItem key={betelita.id} value={betelita.id}>
                      {betelita.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddAdmin}
                disabled={!selectedProfileId || addAdmin.isPending}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* Lista de administradores atuais */}
          <div className="space-y-2">
            <Label>Administradores Atuais</Label>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : admins && admins.length > 0 ? (
              <div className="space-y-2">
                {admins.map((admin) => (
                  <Card key={admin.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{admin.profile?.full_name}</p>
                        {admin.profile?.email && (
                          <p className="text-sm text-muted-foreground">
                            {admin.profile.email}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveAdmin(admin.id)}
                        disabled={removeAdmin.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Nenhum administrador designado ainda.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
