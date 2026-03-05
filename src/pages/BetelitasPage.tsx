import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Car, Shield, Bell } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBetelitas, type Betelita } from "@/hooks/useBetelitas";
import { BetelitaRow } from "@/components/betelitas/BetelitaRow";
import { BetelitasTableSkeleton } from "@/components/betelitas/BetelitasTableSkeleton";
import { CreateBetelitaDialog } from "@/components/betelitas/CreateBetelitaDialog";
import { ViewBetelitaDialog } from "@/components/betelitas/ViewBetelitaDialog";
import { EditBetelitaDialog } from "@/components/betelitas/EditBetelitaDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedCongregation } from "@/contexts/CongregationContext";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { BroadcastNotificationDialog } from "@/components/betelitas/BroadcastNotificationDialog";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export default function BetelitasPage() {
  type DeleteProfileMutationInput = {
    person: Betelita;
    forceDeleteDriverTrips?: boolean;
  };

  type DeleteProfileMutationResult =
    | { status: "deleted"; profileId: string }
    | {
        status: "needs_confirmation";
        person: Betelita;
        message: string;
        tripsCount: number;
      };

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "drivers" | "admins">("all");
  const [viewPerson, setViewPerson] = useState<Betelita | null>(null);
  const [editPerson, setEditPerson] = useState<Betelita | null>(null);
  const [deletePerson, setDeletePerson] = useState<Betelita | null>(null);
  const [confirmDeleteTripsContext, setConfirmDeleteTripsContext] = useState<{
    person: Betelita;
    message: string;
    tripsCount: number;
  } | null>(null);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: betelitas = [], isLoading } = useBetelitas();
  const { isAdmin } = useAuth();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { selectedCongregationId } = useSelectedCongregation();

  // Get the effective congregation ID for query invalidation
  const { profile } = useAuth();
  const effectiveCongregationId = isSuperAdmin ? selectedCongregationId : profile?.congregation_id;

  const { data: notificationSettings } = useQuery({
    queryKey: ["notification-settings", effectiveCongregationId],
    queryFn: async () => {
      if (!effectiveCongregationId) return null;
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("congregation_id", effectiveCongregationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCongregationId,
  });

  const deleteMutation = useMutation({
    mutationFn: async ({
      person,
      forceDeleteDriverTrips = false,
    }: DeleteProfileMutationInput): Promise<DeleteProfileMutationResult> => {
      // Use Supabase client's built-in functions.invoke method
      // This automatically handles authentication and headers correctly
      const { data, error } = await supabase.functions.invoke('delete-profile', {
        body: { profileId: person.id, forceDeleteDriverTrips },
      });

      if (error) {
        console.error("Delete profile error:", error);
        throw new Error(error.message || "Erro ao excluir perfil");
      }

      if (data?.requiresConfirmation && data?.code === "PROFILE_LINKED_AS_DRIVER") {
        return {
          status: "needs_confirmation",
          person,
          message:
            data?.error ||
            "Este perfil está vinculado como motorista em viagens. Deseja continuar e excluir também essas viagens?",
          tripsCount: data?.tripsCount ?? 0,
        };
      }

      if (!data?.success) {
        throw new Error(data?.error || "Erro ao excluir perfil");
      }
      
      return { status: "deleted", profileId: person.id };
    },
    onSuccess: (result) => {
      if (result.status === "needs_confirmation") {
        setDeletePerson(null);
        setConfirmDeleteTripsContext({
          person: result.person,
          message: result.message,
          tripsCount: result.tripsCount,
        });
        return;
      }

      // Invalidate and refetch with the correct query key
      queryClient.invalidateQueries({
        queryKey: ["betelitas", effectiveCongregationId]
      });
      toast({
        title: "Betelita excluído",
        description: "O membro foi removido com sucesso.",
      });
      setDeletePerson(null);
      setConfirmDeleteTripsContext(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredBetelitas = betelitas.filter((person) => {
    const matchesSearch = person.full_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "drivers" && person.is_driver) ||
      (filter === "admins" && person.is_admin);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Betelitas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${betelitas.length} membros cadastrados`}
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="gap-2 w-full sm:w-auto"
              onClick={() => setShowBroadcastDialog(true)}
            >
              <Bell className="h-4 w-4" />
              Notificar Todos
            </Button>
            <CreateBetelitaDialog>
              <Button className="gap-2 bg-primary hover:bg-primary/90 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Adicionar Betelita
              </Button>
            </CreateBetelitaDialog>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9 sm:h-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className="flex-1 sm:flex-none whitespace-nowrap"
          >
            Todos
          </Button>
          <Button
            variant={filter === "drivers" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("drivers")}
            className="gap-1 flex-1 sm:flex-none whitespace-nowrap"
          >
            <Car className="h-4 w-4" />
            Motoristas
          </Button>
          <Button
            variant={filter === "admins" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("admins")}
            className="gap-1 flex-1 sm:flex-none whitespace-nowrap"
          >
            <Shield className="h-4 w-4" />
            Admins
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <BetelitasTableSkeleton />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium text-muted-foreground">
                    Nome
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground hidden md:table-cell">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                    Sexo
                  </th>
                  <th className="text-left px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBetelitas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground text-sm"
                    >
                      {searchTerm || filter !== "all"
                        ? "Nenhum resultado encontrado"
                        : "Nenhum membro cadastrado"}
                    </td>
                  </tr>
                ) : (
                  filteredBetelitas.map((person) => (
                    <BetelitaRow
                      key={person.id}
                      person={person}
                      onViewProfile={setViewPerson}
                      onEdit={setEditPerson}
                      onDelete={setDeletePerson}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      <ViewBetelitaDialog
        person={viewPerson}
        open={!!viewPerson}
        onOpenChange={(open) => !open && setViewPerson(null)}
      />

      <EditBetelitaDialog
        person={editPerson}
        open={!!editPerson}
        onOpenChange={(open) => !open && setEditPerson(null)}
        allBetelitas={betelitas}
      />

      <AlertDialog open={!!deletePerson} onOpenChange={(open) => !open && setDeletePerson(null)}>
        <AlertDialogContent className="w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Betelita</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tem certeza que deseja excluir <strong>{deletePerson?.full_name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto order-2 sm:order-1">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePerson && deleteMutation.mutate({ person: deletePerson })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto order-1 sm:order-2"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmDeleteTripsContext}
        onOpenChange={(open) => !open && setConfirmDeleteTripsContext(null)}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Perfil vinculado como motorista</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {confirmDeleteTripsContext?.message}
              {confirmDeleteTripsContext?.tripsCount
                ? ` (${confirmDeleteTripsContext.tripsCount} viagem(ns) vinculada(s)).`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto order-2 sm:order-1">Não, cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDeleteTripsContext &&
                deleteMutation.mutate({
                  person: confirmDeleteTripsContext.person,
                  forceDeleteDriverTrips: true,
                })
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto order-1 sm:order-2"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Sim, excluir viagens e perfil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BroadcastNotificationDialog
        open={showBroadcastDialog}
        onOpenChange={setShowBroadcastDialog}
        congregationId={effectiveCongregationId}
        defaultMessage={notificationSettings?.message}
      />
    </div>
  );
}
