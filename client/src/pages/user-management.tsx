import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MainLayout } from '@/components/layout/main-layout';
import { UserPlus, Eye, EyeOff, Loader2, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CreateUserRequest } from '@shared/schema';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'readOnly';
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function UserManagement() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<CreateUserRequest>({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    active: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not admin
  if (!hasRole('admin')) {
    return (
      <MainLayout title="Acceso Denegado">
        <div className="p-6">
          <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Acceso denegado. Solo los administradores pueden gestionar usuarios.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  // Fetch users
  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ['/api/auth/users'],
    queryFn: async () => {
      const response = await fetch('/api/auth/users', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserRequest) => {
      const response = await apiRequest('POST', '/api/auth/users', userData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "¡Usuario creado!",
        description: "El usuario ha sido creado correctamente.",
      });
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        active: true
      });
      setError('');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/users'] });
    },
    onError: (err: any) => {
      const errorMessage = err.error || 'Error al crear usuario';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    if (formData.name.length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }
    if (!formData.email.trim()) {
      setError('El correo electrónico es requerido');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Correo electrónico inválido');
      return;
    }
    if (!formData.password) {
      setError('La contraseña es requerida');
      return;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    createUserMutation.mutate(formData);
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'staff': return 'Personal';
      case 'readOnly': return 'Solo Lectura';
      default: return role;
    }
  };

  return (
    <MainLayout title="Gestión de Usuarios" subtitle="Administra los usuarios del sistema">
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">Administra los usuarios del sistema</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create User Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span>Crear Nuevo Usuario</span>
              </CardTitle>
              <CardDescription>
                Añade un nuevo usuario al sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo</Label>
                  <Input
                    id="name"
                    type="text"
                    data-testid="input-user-name"
                    placeholder="Juan Pérez"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    data-testid="input-user-email"
                    placeholder="juan@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      data-testid="input-user-password"
                      placeholder="Contraseña segura"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol del Usuario</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: 'admin' | 'staff' | 'readOnly') => 
                      setFormData({ ...formData, role: value })
                    }
                    data-testid="select-user-role"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Personal</SelectItem>
                      <SelectItem value="readOnly">Solo Lectura</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, active: !!checked })
                    }
                    data-testid="checkbox-user-active"
                  />
                  <Label htmlFor="active">Usuario activo</Label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  data-testid="button-create-user"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando usuario...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Crear Usuario
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>Usuarios Existentes</CardTitle>
              <CardDescription>
                Lista de todos los usuarios del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Cargando usuarios...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No hay usuarios registrados
                    </p>
                  ) : (
                    users.map((u) => (
                      <div 
                        key={u.id} 
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        data-testid={`user-card-${u.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{u.name}</h4>
                            {u.active ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">
                              {getRoleName(u.role)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Creado: {new Date(u.createdAt).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}