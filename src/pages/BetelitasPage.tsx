import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Car, Shield } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "drivers" | "admins">("all");
  const [viewPerson, setViewPerson] = useState<Betelita | null>(null);
  const [editPerson, setEditPerson] = useState<Betelita | null>(null);
  const [deletePerson, setDeletePerson] = useState<Betelita | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: betelitas = [], isLoading } = useBetelitas();
  const { isAdmin } = useAuth();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { selectedCongregationId } = useSelectedCongregation();

  // Get the effective congregation ID for query invalidation
  const effectiveCongregationId = isSuperAdmin ? selectedCongregationId : undefined;

  const deleteMutation = useMutation({
    mutationFn: async (person: Betelita) => {
      // If the person has a spouse, clear their spouse's link first
      if (person.spouse_id) {
        await supabase
          .from("profiles")
          .update({ spouse_id: null, is_married: false })
          .eq("id", person.spouse_id);
      }

      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", person.id);

      if (error) throw error;
      
      return person.id;
    },
    onSuccess: () => {
      // Invalidate and refetch with the correct query key
      queryClient.invalidateQueries({
        queryKey: ["betelitas", effectiveCongregationId]
      });
      toast({
        title: "Betelita excluído",
        description: "O membro foi removido com sucesso.",
      });
      setDeletePerson(null);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Betelitas</h1>
          <p className="text-muted-foreground">
            {isLoading ? "Carregando..." : `${betelitas.length} membros cadastrados`}
          </p>
        </div>
        {isAdmin && (
          <CreateBetelitaDialog>
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Adicionar Betelita
            </Button>
          </CreateBetelitaDialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Todos
          </Button>
          <Button
            variant={filter === "drivers" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("drivers")}
            className="gap-1"
          >
            <Car className="h-4 w-4" />
            Motoristas
          </Button>
          <Button
            variant={filter === "admins" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("admins")}
            className="gap-1"
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
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Nome
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground hidden md:table-cell">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                    Sexo
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBetelitas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Betelita</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deletePerson?.full_name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePerson && deleteMutation.mutate(deletePerson)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
