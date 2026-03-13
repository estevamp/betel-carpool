# Exemplos de Código Frontend - Sistema Multi-Congregação

## 1. Tipos TypeScript

Adicione ao arquivo [`src/integrations/supabase/types.ts`](src/integrations/supabase/types.ts):

```typescript
// Tipos para congregações
export interface Congregation {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CongregationAdministrator {
  id: string;
  profile_id: string;
  congregation_id: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  congregation?: Congregation;
}

// Adicionar ao tipo Profile existente
export interface Profile {
  // ... campos existentes
  congregation_id?: string | null;
  congregation?: Congregation;
}
```

## 2. Hooks Personalizados

### `src/hooks/useCongregations.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Congregation } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export const useCongregations = () => {
  const queryClient = useQueryClient();

  // Buscar todas as congregações
  const { data: congregations, isLoading } = useQuery({
    queryKey: ['congregations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('congregations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Congregation[];
    },
  });

  // Criar congregação
  const createCongregation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('congregations')
        .insert({ name })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregations'] });
      toast.success('Congregação criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar congregação: ' + error.message);
    },
  });

  // Atualizar congregação
  const updateCongregation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('congregations')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregations'] });
      toast.success('Congregação atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar congregação: ' + error.message);
    },
  });

  // Deletar congregação
  const deleteCongregation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('congregations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregations'] });
      toast.success('Congregação deletada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao deletar congregação: ' + error.message);
    },
  });

  return {
    congregations,
    isLoading,
    createCongregation,
    updateCongregation,
    deleteCongregation,
  };
};
```

### `src/hooks/useCongregationAdmins.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CongregationAdministrator } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export const useCongregationAdmins = (congregationId?: string) => {
  const queryClient = useQueryClient();

  // Buscar administradores
  const { data: admins, isLoading } = useQuery({
    queryKey: ['congregation-admins', congregationId],
    queryFn: async () => {
      let query = supabase
        .from('congregation_administrators')
        .select(`
          *,
          profile:profiles(*),
          congregation:congregations(*)
        `);
      
      if (congregationId) {
        query = query.eq('congregation_id', congregationId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as CongregationAdministrator[];
    },
    enabled: !!congregationId || congregationId === undefined,
  });

  // Adicionar administrador
  const addAdmin = useMutation({
    mutationFn: async ({ profileId, congregationId }: { profileId: string; congregationId: string }) => {
      const { data, error } = await supabase
        .from('congregation_administrators')
        .insert({ profile_id: profileId, congregation_id: congregationId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregation-admins'] });
      toast.success('Administrador adicionado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar administrador: ' + error.message);
    },
  });

  // Remover administrador
  const removeAdmin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('congregation_administrators')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregation-admins'] });
      toast.success('Administrador removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover administrador: ' + error.message);
    },
  });

  return {
    admins,
    isLoading,
    addAdmin,
    removeAdmin,
  };
};
```

### `src/hooks/useIsSuperAdmin.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useIsSuperAdmin = () => {
  const { data: isSuperAdmin, isLoading } = useQuery({
    queryKey: ['is-super-admin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .single();
      
      if (error) return false;
      return !!data;
    },
  });

  return { isSuperAdmin: isSuperAdmin ?? false, isLoading };
};
```

## 3. Componentes de UI

### `src/components/congregations/CongregationSelector.tsx`

```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCongregations } from '@/hooks/useCongregations';

interface CongregationSelectorProps {
  value?: string | null;
  onChange: (value: string) => void;
}

export const CongregationSelector = ({ value, onChange }: CongregationSelectorProps) => {
  const { congregations, isLoading } = useCongregations();

  if (isLoading) {
    return <div>Carregando congregações...</div>;
  }

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder="Selecione uma congregação" />
      </SelectTrigger>
      <SelectContent>
        {congregations?.map((congregation) => (
          <SelectItem key={congregation.id} value={congregation.id}>
            {congregation.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

### `src/components/congregations/CreateCongregationDialog.tsx`

```typescript
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCongregations } from '@/hooks/useCongregations';
import { Plus } from 'lucide-react';

export const CreateCongregationDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const { createCongregation } = useCongregations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createCongregation.mutateAsync(name);
    setName('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Congregação
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Nova Congregação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Congregação</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Congregação Central"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createCongregation.isPending}>
              {createCongregation.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

### `src/components/congregations/CongregationCard.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Congregation } from '@/integrations/supabase/types';
import { Pencil, Trash2, Users } from 'lucide-react';

interface CongregationCardProps {
  congregation: Congregation;
  onEdit: (congregation: Congregation) => void;
  onDelete: (id: string) => void;
  onManageAdmins: (congregation: Congregation) => void;
}

export const CongregationCard = ({ 
  congregation, 
  onEdit, 
  onDelete, 
  onManageAdmins 
}: CongregationCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{congregation.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onManageAdmins(congregation)}
          >
            <Users className="mr-2 h-4 w-4" />
            Administradores
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(congregation)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(congregation.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Deletar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

## 4. Páginas

### `src/pages/CongregationsPage.tsx`

```typescript
import { useState } from 'react';
import { useCongregations } from '@/hooks/useCongregations';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { CreateCongregationDialog } from '@/components/congregations/CreateCongregationDialog';
import { CongregationCard } from '@/components/congregations/CongregationCard';
import { Congregation } from '@/integrations/supabase/types';
import { Navigate } from 'react-router-dom';

export default function CongregationsPage() {
  const { isSuperAdmin, isLoading: loadingAuth } = useIsSuperAdmin();
  const { congregations, isLoading, deleteCongregation } = useCongregations();
  const [selectedCongregation, setSelectedCongregation] = useState<Congregation | null>(null);

  if (loadingAuth) {
    return <div>Carregando...</div>;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar esta congregação?')) {
      await deleteCongregation.mutateAsync(id);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Congregações</h1>
        <CreateCongregationDialog />
      </div>

      {isLoading ? (
        <div>Carregando congregações...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {congregations?.map((congregation) => (
            <CongregationCard
              key={congregation.id}
              congregation={congregation}
              onEdit={setSelectedCongregation}
              onDelete={handleDelete}
              onManageAdmins={setSelectedCongregation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

## 5. Atualização do AppSidebar

Adicione ao [`src/components/layout/AppSidebar.tsx`](src/components/layout/AppSidebar.tsx):

```typescript
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { Building2 } from 'lucide-react';

// Dentro do componente AppSidebar
const { isSuperAdmin } = useIsSuperAdmin();

// Adicione este item ao menu
{isSuperAdmin && (
  <SidebarMenuItem>
    <SidebarMenuButton asChild>
      <NavLink to="/congregations">
        <Building2 className="h-4 w-4" />
        <span>Congregações</span>
      </NavLink>
    </SidebarMenuButton>
  </SidebarMenuItem>
)}
```

## 6. Atualização das Rotas

Adicione ao [`src/App.tsx`](src/App.tsx):

```typescript
import CongregationsPage from '@/pages/CongregationsPage';

// Dentro das rotas
<Route path="/congregations" element={<CongregationsPage />} />
```

## 7. Atualização dos Hooks Existentes

### Exemplo: `src/hooks/useBetelitas.ts`

```typescript
// Adicione filtro por congregação
export const useBetelitas = (congregationId?: string) => {
  const { data: betelitas, isLoading } = useQuery({
    queryKey: ['betelitas', congregationId],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      // O filtro por congregação é automático via RLS
      // Mas se for super-admin e quiser filtrar por congregação específica:
      if (congregationId) {
        query = query.eq('congregation_id', congregationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return { betelitas, isLoading };
};
```

## 8. Context para Congregação Selecionada (Super-Admin)

### `src/contexts/CongregationContext.tsx`

```typescript
import { createContext, useContext, useState, ReactNode } from 'react';

interface CongregationContextType {
  selectedCongregationId: string | null;
  setSelectedCongregationId: (id: string | null) => void;
}

const CongregationContext = createContext<CongregationContextType | undefined>(undefined);

export const CongregationProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCongregationId, setSelectedCongregationId] = useState<string | null>(null);

  return (
    <CongregationContext.Provider value={{ selectedCongregationId, setSelectedCongregationId }}>
      {children}
    </CongregationContext.Provider>
  );
};

export const useSelectedCongregation = () => {
  const context = useContext(CongregationContext);
  if (!context) {
    throw new Error('useSelectedCongregation must be used within CongregationProvider');
  }
  return context;
};
```

## 9. Uso do Context

Envolva o app com o provider em [`src/main.tsx`](src/main.tsx):

```typescript
import { CongregationProvider } from '@/contexts/CongregationContext';

<CongregationProvider>
  <App />
</CongregationProvider>
```

## 10. Seletor de Congregação no Header (Super-Admin)

```typescript
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { useSelectedCongregation } from '@/contexts/CongregationContext';
import { CongregationSelector } from '@/components/congregations/CongregationSelector';

export const AppHeader = () => {
  const { isSuperAdmin } = useIsSuperAdmin();
  const { selectedCongregationId, setSelectedCongregationId } = useSelectedCongregation();

  return (
    <header>
      {/* ... outros elementos do header */}
      
      {isSuperAdmin && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Visualizando:</span>
          <CongregationSelector
            value={selectedCongregationId}
            onChange={setSelectedCongregationId}
          />
        </div>
      )}
    </header>
  );
};
```

---

**Nota**: Estes são exemplos de código que podem ser adaptados conforme necessário. Certifique-se de ajustar os imports e tipos de acordo com a estrutura do seu projeto.
