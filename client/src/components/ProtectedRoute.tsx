import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'staff' | 'readOnly';
  fallback?: ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRole = 'readOnly',
  fallback = (
    <div className="flex items-center justify-center bg-background dark:bg-gray-900">
      <div className="text-center p-8 bg-card rounded-lg border shadow-sm max-w-md">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Acceso Denegado
        </h2>
        <p className="text-muted-foreground">
          No tienes permisos suficientes para acceder a esta página.
        </p>
      </div>
    </div>
  )
}: ProtectedRouteProps) {
  const { user, hasRole } = useAuth();

  if (!user) {
    // This should be handled by the App component
    return null;
  }

  if (!hasRole(requiredRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}