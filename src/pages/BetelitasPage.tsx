import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Car, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBetelitas } from "@/hooks/useBetelitas";
import { BetelitaRow } from "@/components/betelitas/BetelitaRow";
import { BetelitasTableSkeleton } from "@/components/betelitas/BetelitasTableSkeleton";

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

  const { data: betelitas = [], isLoading } = useBetelitas();

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
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Adicionar Betelita
        </Button>
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
                    <BetelitaRow key={person.id} person={person} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
