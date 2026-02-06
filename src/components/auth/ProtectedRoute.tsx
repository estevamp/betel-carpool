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

  // Check if user has a profile and congregation_id
  if (user && profile && !profile.congregation_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl">Acesso Restrito</CardTitle>
            <CardDescription className="text-base mt-2">
              Você ainda não está vinculado a nenhuma congregação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Para acessar o sistema, você precisa ser convidado pelo coordenador de transportes da sua congregação.
            </p>
            <p className="text-sm text-muted-foreground text-center font-medium">
              Entre em contato com o coordenador de transportes da sua congregação para que ele envie um convite para você.
            </p>
            <div className="pt-4">
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
