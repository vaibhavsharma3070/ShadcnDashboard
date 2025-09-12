import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Package, 
  ShoppingBag, 
  CheckCircle, 
  RotateCcw, 
  Clock,
  ChevronDown
} from "lucide-react";

interface StatusUpdateDropdownProps {
  itemId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

const statusConfig = {
  'in-store': {
    label: 'En Tienda',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: Package
  },
  'reserved': {
    label: 'Reservado',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: Clock
  },
  'sold': {
    label: 'Vendido',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: CheckCircle
  },
  'returned-to-vendor': {
    label: 'Devuelto al Consignador',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: RotateCcw
  }
};

export function StatusUpdateDropdown({ itemId, currentStatus, onStatusChange }: StatusUpdateDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest('PATCH', `/api/items/${itemId}/status`, { status: newStatus });
    },
    onSuccess: (data) => {
      toast({
        title: "Estado Actualizado",
        description: `Estado del artículo cambiado a ${statusConfig[data.status as keyof typeof statusConfig]?.label}`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      
      onStatusChange?.(data.status);
      setIsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Error al actualizar el estado del artículo. Por favor inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  });

  const getCurrentStatusConfig = () => {
    return statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig['in-store'];
  };

  const currentConfig = getCurrentStatusConfig();
  const CurrentIcon = currentConfig.icon;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <Badge variant="secondary" className={`${currentConfig.color} flex items-center gap-1`}>
            <CurrentIcon className="h-3 w-3" />
            {currentConfig.label}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {Object.entries(statusConfig).map(([status, config]) => {
          const Icon = config.icon;
          const isDisabled = status === currentStatus || updateStatusMutation.isPending;
          
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => !isDisabled && updateStatusMutation.mutate(status)}
              disabled={isDisabled}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              {config.label}
              {status === currentStatus && (
                <span className="ml-auto text-xs text-muted-foreground">Actual</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function getStatusBadge(status: string) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['in-store'];
  const Icon = config.icon;
  
  return (
    <Badge variant="secondary" className={`${config.color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}