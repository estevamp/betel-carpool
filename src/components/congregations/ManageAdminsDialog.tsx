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
  const { data: betelitas, isLoading: isLoadingBetelitas } = useBetelitas({ congregationId: congregation?.id });

  const handleAddAdmin = async () => {
    if (!selectedProfileId || !congregation) return;
    
    await addAdmin.mutateAsync({
      profileId: selectedProfileId,
      congregationId: congregation.id,
    });
    setSelectedProfileId('');
  };

  const handleRemoveAdmin = async (adminId: string, profileId: string) => {
    if (!congregation) return;
    
    if (confirm('Tem certeza que deseja remover este administrador?')) {
      await removeAdmin.mutateAsync({
        id: adminId,
        profileId: profileId,
        congregationId: congregation.id,
      });
    }
  };

  // Filtrar betelitas que já não são administradores desta congregação
  // E que já fizeram login (têm user_id vinculado)
  const availableBetelitas = betelitas?.filter(
    (b) => !admins?.some((a) => a.profile_id === b.id) && b.user_id !== null
  );

  // Betelitas que ainda não fizeram login
  const betelitasWithoutLogin = betelitas?.filter(
    (b) => !admins?.some((a) => a.profile_id === b.id) && b.user_id === null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl break-words">
            Gerenciar Administradores - {congregation?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Adicionar novo administrador */}
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Adicionar Administrador</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={selectedProfileId}
                onValueChange={setSelectedProfileId}
                disabled={isLoadingBetelitas}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={
                    isLoadingBetelitas
                      ? "Carregando..."
                      : availableBetelitas && availableBetelitas.length > 0
                        ? "Selecione um betelita"
                        : "Nenhum betelita disponível"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableBetelitas && availableBetelitas.length > 0 ? (
                    availableBetelitas.map((betelita) => (
                      <SelectItem key={betelita.id} value={betelita.id}>
                        {betelita.full_name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      Nenhum betelita disponível nesta congregação
                    </div>
                  )}
                  {betelitasWithoutLogin && betelitasWithoutLogin.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                        Aguardando primeiro login
                      </div>
                      {betelitasWithoutLogin.map((betelita) => (
                        <SelectItem
                          key={betelita.id}
                          value={betelita.id}
                          disabled
                          className="opacity-50"
                        >
                          {betelita.full_name} (não fez login ainda)
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddAdmin}
                disabled={!selectedProfileId || addAdmin.isPending || isLoadingBetelitas}
                className="w-full sm:w-auto"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* Lista de administradores atuais */}
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Administradores Atuais</Label>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : admins && admins.length > 0 ? (
              <div className="space-y-2">
                {admins.map((admin) => (
                  <Card key={admin.id}>
                    <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base break-words">{admin.profile?.full_name}</p>
                        {admin.profile?.email && (
                          <p className="text-xs sm:text-sm text-muted-foreground break-all">
                            {admin.profile.email}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveAdmin(admin.id, admin.profile_id)}
                        disabled={removeAdmin.isPending}
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="h-4 w-4 sm:mr-0" />
                        <span className="sm:hidden ml-2">Remover</span>
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

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
