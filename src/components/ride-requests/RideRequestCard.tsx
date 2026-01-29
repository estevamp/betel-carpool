import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { Search, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRideRequests, RideRequest } from "@/hooks/useRideRequests";
import { useNavigate } from "react-router-dom";

interface RideRequestCardProps {
  request: RideRequest;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export function RideRequestCard({ request }: RideRequestCardProps) {
  const { profile, isAdmin } = useAuth();
  const { deleteRideRequest, isDeleting } = useRideRequests();
  const navigate = useNavigate();

  const canDelete = profile?.id === request.profile_id || isAdmin;
  const formattedDate = format(new Date(request.requested_date), "dd/MM/yyyy", {
    locale: ptBR,
  });

  const handleCreateTrip = () => {
    // Navigate to trips page - in future could pre-fill data
    navigate("/viagens");
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja remover esta solicitação?")) {
      deleteRideRequest(request.id);
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      className="bg-card rounded-xl border border-warning/30 shadow-card p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 shrink-0">
            <Search className="h-6 w-6 text-warning" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">
              {request.profile_name}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formattedDate}
              </span>
            </div>
            {request.notes && (
              <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded-lg">
                {request.notes}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCreateTrip}>
            Criar Viagem
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
