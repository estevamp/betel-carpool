import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TourButtonProps {
  onClick: () => void;
}

export function TourButton({ onClick }: TourButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, type: "spring", stiffness: 300, damping: 22 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={onClick}
            className="h-11 w-11 rounded-full shadow-lg border-border bg-card hover:bg-accent hover:scale-105 transition-transform"
            aria-label="Abrir tour do aplicativo"
          >
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </Button>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>Tour do aplicativo</p>
      </TooltipContent>
    </Tooltip>
  );
}
