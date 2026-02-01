import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCongregations, Congregation } from '@/hooks/useCongregations';

interface EditCongregationDialogProps {
  congregation: Congregation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditCongregationDialog = ({ congregation, open, onOpenChange }: EditCongregationDialogProps) => {
  const [name, setName] = useState('');
  const { updateCongregation } = useCongregations();

  useEffect(() => {
    if (congregation) {
      setName(congregation.name);
    }
  }, [congregation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !congregation) return;

    await updateCongregation.mutateAsync({ id: congregation.id, name });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Congregação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Nome da Congregação</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Congregação Central"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateCongregation.isPending}>
              {updateCongregation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
