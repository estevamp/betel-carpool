import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

// Componente de Loading reutilizável
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

// Componente de erro reutilizável
const AccessDeniedCard = ({ 
  title, 
  description, 
  message, 
  email, 
  onSignOut 
}: {
  title: string;
  description: string;
  message: string;
  email: string;
  onSignOut: () => void;
}) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="max-w-md w-full">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-amber-500" />
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="text-base mt-2">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-foreground text-center">{message}</p>
        </div>
        <div className="text-xs text-muted-foreground text-center">
          <p className="font-medium">E-mail: {email}</p>
        </div>
        <Button onClick={onSignOut} variant="outline" className="w-full">
          Sair
        </Button>
      </CardContent>
    </Card>
  </div>
);

// Componente principal simplificado
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading, signOut } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingSpinner />;
  
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!profile) {
    return (
      <AccessDeniedCard
        title="Perfil Não Encontrado"
        description="Não foi possível carregar seu perfil"
        message="Você precisa receber um convite de um administrador para acessar o sistema. Entre em contato com o coordenador de transportes da sua congregação."
        email={user.email || ''}
        onSignOut={signOut}
      />
    );
  }

  if (!profile.congregation_id) {
    return (
      <AccessDeniedCard
        title="Acesso Restrito"
        description="Você não está vinculado a nenhuma congregação"
        message="Para acessar o sistema, você precisa receber um convite de um administrador. Entre em contato com o coordenador de transportes da sua congregação e solicite que ele envie um convite para o seu e-mail."
        email={user.email || ''}
        onSignOut={signOut}
      />
    );
  }

  // Fully authenticated with congregation
  return <>{children}</>;
}
