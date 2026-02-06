import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, isLoading, signOut } = useAuth();
  const location = useLocation();
  const [showRestrictedAccess, setShowRestrictedAccess] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    // Show restricted access if:
    // 1. Not loading anymore
    // 2. User is authenticated
    // 3. Profile exists but has no congregation_id
    if (!isLoading && user && profile && !profile.congregation_id) {
      console.log(`[ProtectedRoute] Profile without congregation detected - showing restricted access`);
      console.log(`[ProtectedRoute] Profile: ${profile.full_name}, Email: ${profile.email}, Congregation ID: ${profile.congregation_id}`);
      timer = setTimeout(() => {
        setShowRestrictedAccess(true);
      }, 500);
    } else {
      console.log(`[ProtectedRoute] Access check - isLoading: ${isLoading}, user: ${!!user}, profile: ${!!profile}, congregation_id: ${profile?.congregation_id}`);
      setShowRestrictedAccess(false);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, user, profile]);

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

  if (showRestrictedAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-amber-500" />
            </div>
            <CardTitle className="text-2xl">Acesso Restrito</CardTitle>
            <CardDescription className="text-base mt-2">Você não está vinculado a nenhuma congregação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="text-sm text-foreground text-center">
                Para acessar o sistema, você precisa receber um convite de um administrador.
              </p>
              <p className="text-sm text-foreground text-center font-semibold">
                Entre em contato com o coordenador de transportes da sua congregação e solicite que ele envie um convite
                para o seu e-mail.
              </p>
            </div>
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>Após receber o convite, você poderá acessar o sistema normalmente.</p>
              <p className="font-medium">E-mail cadastrado: {user.email}</p>
            </div>
            <div className="pt-2">
              <Button onClick={signOut} variant="outline" className="w-full">
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no profile found, show loading (shouldn't happen as isLoading would be false)
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Verificando perfil...</p>
        </div>
      </div>
    );
  }

  // Renderiza o conteúdo protegido se o usuário tiver um perfil com congregação
  if (profile.congregation_id) {
    return <>{children}</>;
  }

  // If we reach here, profile exists but no congregation_id
  // The useEffect will trigger showRestrictedAccess
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground">Verificando acesso...</p>
      </div>
    </div>
  );
}
