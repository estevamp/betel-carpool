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
        <CardTitle className="text-lg sm:text-xl break-words">{congregation.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onManageAdmins(congregation)}
            className="w-full sm:w-auto justify-start sm:justify-center"
          >
            <Users className="mr-2 h-4 w-4" />
            Administradores
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(congregation)}
            className="w-full sm:w-auto justify-start sm:justify-center"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(congregation.id)}
            className="w-full sm:w-auto justify-start sm:justify-center"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Deletar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
