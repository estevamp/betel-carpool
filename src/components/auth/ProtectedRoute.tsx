import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, isLoading, signOut } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if user doesn't have a profile at all (not invited) or is not linked to a congregation
  if (user && (!profile || !profile.congregation_id)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-amber-500" />
            </div>
            <CardTitle className="text-2xl">Acesso Restrito</CardTitle>
            <CardDescription className="text-base mt-2">
              Você não está vinculado a nenhuma congregação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="text-sm text-foreground text-center">
                Para acessar o sistema, você precisa receber um convite de um administrador.
              </p>
              <p className="text-sm text-foreground text-center font-semibold">
                Entre em contato com o coordenador de transportes da sua congregação e solicite que ele envie um convite para o seu e-mail.
              </p>
            </div>
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>Após receber o convite, você poderá acessar o sistema normalmente.</p>
              <p className="font-medium">E-mail cadastrado: {user.email}</p>
            </div>
            <div className="pt-2">
              <Button
                onClick={signOut}
                variant="outline"
                className="w-full"
              >
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
