import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Congregation } from '@/hooks/useCongregations';
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
        <div className="flex flex-wrap gap-2">
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
