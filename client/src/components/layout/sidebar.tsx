import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  Handshake,
  Users,
  CreditCard,
  DollarSign,
  Receipt,
  TrendingUp,
  BarChart3,
  Gem,
  Settings,
  User,
  FileText,
  LogOut,
  UserCog,
} from "lucide-react";

const navigation = [
  { name: "Panel Principal", href: "/", icon: LayoutDashboard },
  {
    name: "Operación",
    items: [
      { name: "Inventario", href: "/inventory", icon: Package },
      { name: "Consignadores", href: "/vendors", icon: Handshake },
      { name: "Clientes", href: "/clients", icon: Users },
      { name: "Contratos", href: "/contracts", icon: FileText },
    ],
  },
  {
    name: "Finanzas",
    items: [
      { name: "Pagos Entrantes", href: "/payments", icon: CreditCard },
      { name: "Pagos Salientes", href: "/payouts", icon: DollarSign },
      { name: "Gastos", href: "/expenses", icon: Receipt },
    ],
  },
  {
    name: "Analítica",
    items: [
      { name: "Reportes", href: "/reports", icon: BarChart3 },
      { name: "Rentabilidad", href: "/profitability", icon: TrendingUp },
    ],
  },
  { name: "Configuración", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout, hasRole } = useAuth();

  return (
    <div className="w-72 bg-white dark:bg-gray-900 sidebar-shadow flex flex-col border-r border-border">
      {/* Logo/Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-primary to-purple-600 rounded-lg flex items-center justify-center">
            <Gem className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Luxette</h1>
            <p className="text-sm text-muted-foreground">Sistema de Gestión</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-6 space-y-1">
        {navigation.map((item) => (
          <div key={item.name}>
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 mx-2 text-sm font-medium rounded-lg transition-colors",
                  location === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ) : (
              <>
                <div className="px-4 py-2 mt-6 first:mt-0">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {item.name}
                  </h3>
                </div>
                {item.items?.map((subItem) => (
                  <Link
                    key={subItem.name}
                    href={subItem.href}
                    className={cn(
                      "flex items-center px-4 py-3 mx-2 text-sm font-medium rounded-lg transition-colors",
                      location === subItem.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <subItem.icon className="mr-3 h-5 w-5" />
                    {subItem.name}
                  </Link>
                ))}
              </>
            )}
          </div>
        ))}
        
        {/* Admin-only Usuarios link */}
        {hasRole('admin') && (
          <Link
            href="/user-management"
            className={cn(
              "flex items-center px-4 py-3 mx-2 text-sm font-medium rounded-lg transition-colors",
              location === "/user-management"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            data-testid="link-user-management"
          >
            <UserCog className="mr-3 h-5 w-5" />
            Usuarios
          </Link>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{user?.name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground">
              {user?.role === 'admin' ? 'Administrador' : 
               user?.role === 'staff' ? 'Personal' : 
               user?.role === 'readOnly' ? 'Solo Lectura' : 'Usuario'}
            </p>
          </div>
        </div>
        
        {/* Logout Button */}
        <Button 
          variant="ghost" 
          onClick={logout}
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 dark:text-red-400 dark:hover:text-red-300"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}
