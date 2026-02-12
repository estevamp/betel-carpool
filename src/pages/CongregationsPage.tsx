import { useState } from 'react';
import { useCongregations, Congregation } from '@/hooks/useCongregations';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { CreateCongregationDialog } from '@/components/congregations/CreateCongregationDialog';
import { EditCongregationDialog } from '@/components/congregations/EditCongregationDialog';
import { ManageAdminsDialog } from '@/components/congregations/ManageAdminsDialog';
import { CongregationCard } from '@/components/congregations/CongregationCard';
import { Navigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function CongregationsPage() {
  const { isSuperAdmin, isLoading: loadingAuth } = useIsSuperAdmin();
  const { congregations, isLoading, deleteCongregation } = useCongregations();
  const [selectedCongregation, setSelectedCongregation] = useState<Congregation | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [adminsDialogOpen, setAdminsDialogOpen] = useState(false);

  if (loadingAuth) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleEdit = (congregation: Congregation) => {
    setSelectedCongregation(congregation);
    setEditDialogOpen(true);
  };

  const handleManageAdmins = (congregation: Congregation) => {
    setSelectedCongregation(congregation);
    setAdminsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar esta congregação? Todos os dados associados serão afetados.')) {
      await deleteCongregation.mutateAsync(id);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold">Gerenciar Congregações</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Crie e gerencie congregações e seus administradores
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <CreateCongregationDialog />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : congregations && congregations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {congregations.map((congregation) => (
            <CongregationCard
              key={congregation.id}
              congregation={congregation}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onManageAdmins={handleManageAdmins}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm sm:text-base text-muted-foreground mb-4">
            Nenhuma congregação cadastrada ainda.
          </p>
          <CreateCongregationDialog />
        </div>
      )}

      <EditCongregationDialog
        congregation={selectedCongregation}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <ManageAdminsDialog
        congregation={selectedCongregation}
        open={adminsDialogOpen}
        onOpenChange={setAdminsDialogOpen}
      />
    </div>
  );
}
