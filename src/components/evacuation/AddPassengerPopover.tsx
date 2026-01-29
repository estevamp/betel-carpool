import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useProfiles } from "@/hooks/useProfiles";
import { useEvacuation } from "@/hooks/useEvacuation";

interface AddPassengerPopoverProps {
  carId: string;
  children: React.ReactNode;
}

export function AddPassengerPopover({
  carId,
  children,
}: AddPassengerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const { data: profiles = [] } = useProfiles();
  const { addPassenger, isAddingPassenger, allocatedPassengerIds, allocatedDriverIds } =
    useEvacuation();

  // Filter out already allocated people
  const availableProfiles = profiles.filter(
    (p) => !allocatedPassengerIds.has(p.id) && !allocatedDriverIds.has(p.id)
  );

  const handleSelect = (profileId: string) => {
    addPassenger(
      { carId, passengerId: profileId },
      {
        onSuccess: () => {
          setOpen(false);
          setValue("");
        },
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[250px] p-0 bg-popover" align="start">
        <Command>
          <CommandInput placeholder="Buscar pessoa..." />
          <CommandList>
            <CommandEmpty>Nenhuma pessoa disponível</CommandEmpty>
            <CommandGroup>
              {availableProfiles.map((profile) => (
                <CommandItem
                  key={profile.id}
                  value={profile.full_name}
                  onSelect={() => handleSelect(profile.id)}
                  disabled={isAddingPassenger}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === profile.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {profile.full_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
