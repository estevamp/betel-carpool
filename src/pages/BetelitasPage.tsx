import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Plus, 
  Users, 
  Search,
  Car,
  Mail,
  MoreVertical,
  Shield,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data
const betelitas = [
  { id: 1, name: "Estevam Palombi", email: "estevamp@gmail.com", sex: "Homem", isDriver: true, isAdmin: true, isExempt: false, pixKey: "estevamp@gmail.com" },
  { id: 2, name: "Aline Palombi", email: "", sex: "Mulher", isDriver: true, isAdmin: false, isExempt: false, married: true, husband: "Estevam Palombi" },
  { id: 3, name: "Jonatã Bessa", email: "jonata@gmail.com", sex: "Homem", isDriver: true, isAdmin: false, isExempt: false, pixKey: "jonata@gmail.com" },
  { id: 4, name: "Gabi Bessa", email: "", sex: "Mulher", isDriver: true, isAdmin: false, isExempt: false, married: true, husband: "Jonatã Bessa" },
  { id: 5, name: "Rafael Maguetas", email: "rafael@gmail.com", sex: "Homem", isDriver: true, isAdmin: false, isExempt: false },
  { id: 6, name: "Leonardo Silva", email: "leonardo@gmail.com", sex: "Homem", isDriver: false, isAdmin: false, isExempt: false },
  { id: 7, name: "Felipe Oliveira", email: "felipe@gmail.com", sex: "Homem", isDriver: false, isAdmin: false, isExempt: false },
  { id: 8, name: "Adriano Diniz", email: "adriano@gmail.com", sex: "Homem", isDriver: false, isAdmin: false, isExempt: false },
  { id: 9, name: "Caronista", email: "", sex: "Homem", isDriver: false, isAdmin: false, isExempt: true },
  { id: 10, name: "Orador", email: "", sex: "Homem", isDriver: false, isAdmin: false, isExempt: true },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export default function BetelitasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "drivers" | "admins">("all");

  const filteredBetelitas = betelitas.filter((person) => {
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "drivers" && person.isDriver) ||
      (filter === "admins" && person.isAdmin);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Betelitas</h1>
          <p className="text-muted-foreground">
            {betelitas.length} membros cadastrados
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
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground hidden lg:table-cell">Sexo</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredBetelitas.map((person) => (
                <motion.tr
                  key={person.id}
                  variants={itemVariants}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium",
                        person.sex === "Homem" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                      )}>
                        {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{person.name}</p>
                        {person.married && (
                          <p className="text-xs text-muted-foreground">Casada com {person.husband}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {person.email ? (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {person.email}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground/50">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">{person.sex}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {person.isDriver && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          <Car className="h-3 w-3" />
                          Motorista
                        </span>
                      )}
                      {person.isAdmin && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                          <Shield className="h-3 w-3" />
                          Admin
                        </span>
                      )}
                      {person.isExempt && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info">
                          <CreditCard className="h-3 w-3" />
                          Isento
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem>Ver perfil</DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Remover</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
