import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCongregations } from '@/hooks/useCongregations';

interface CongregationSelectorProps {
  value?: string | null;
  onChange: (value: string) => void;
}

export const CongregationSelector = ({ value, onChange }: CongregationSelectorProps) => {
  const { congregations, isLoading } = useCongregations();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando congregações...</div>;
  }

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="w-[250px]">
        <SelectValue />
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
