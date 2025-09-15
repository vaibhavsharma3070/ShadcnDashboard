import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Package,
  Users,
  TrendingUp,
  ArrowUp,
  Plus,
  CreditCard,
  Handshake,
  AlertTriangle,
  Watch,
  Gem,
  Crown,
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { useState } from "react";
import { useLocation } from "wouter";

interface DashboardMetrics {
  totalRevenue: number;
  activeItems: number;
  pendingPayouts: { min: number; max: number };
  netProfit: { min: number; max: number };
  incomingPayments: number;
  upcomingPayouts: number;
  costRange: { min: number; max: number };
  inventoryValueRange: { min: number; max: number };
}

interface Item {
  itemId: string;
  title: string;
  brand: string;
  model: string;
  minSalesPrice: number | null;
  maxSalesPrice: number | null;
  status: string;
  createdAt: string;
  vendor: {
    name: string;
    email: string;
  };
}

interface TopPerformingItem extends Item {
  profit: number;
}

interface RecentPayment {
  paymentId: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
  client: {
    name: string;
    email: string;
  };
  item: {
    title: string;
    brand: string;
    model: string;
    vendor: {
      name: string;
    };
  };
}

interface PaymentMetrics {
  totalPaymentsReceived: number;
  totalPaymentsAmount: number;
  overduePayments: number;
  upcomingPayments: number;
  averagePaymentAmount: number;
  monthlyPaymentTrend: number;
}

interface LuxetteInventoryData {
  itemCount: number;
  totalCost: number;
  priceRange: { min: number; max: number };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatCurrencyAbbreviated(amount: number) {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  } else {
    return formatCurrency(amount);
  }
}

function formatCurrencyRange(range: { min: number; max: number }) {
  if (range.min === range.max) {
    return formatCurrency(range.min);
  }
  return `${formatCurrency(range.min)} - ${formatCurrency(range.max)}`;
}

function formatCurrencyRangeAbbreviated(min: number, max: number) {
  if (min === max) {
    return formatCurrencyAbbreviated(min);
  }
  return `${formatCurrencyAbbreviated(min)} - ${formatCurrencyAbbreviated(max)}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Hace 1 día";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30)
    return `Hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) !== 1 ? "s" : ""}`;
  return `Hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) !== 1 ? "es" : ""}`;
}

function getStatusBadge(status: string) {
  const statusConfig = {
    "in-store": { label: "En Tienda", className: "status-in-store" },
    reserved: { label: "Reservado", className: "status-reserved" },
    sold: { label: "Vendido", className: "status-sold" },
    returned: { label: "Devuelto", className: "status-returned" },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] ||
    statusConfig["in-store"];

  return (
    <Badge variant="outline" className={`status-badge ${config.className}`}>
      {config.label}
    </Badge>
  );
}

function getItemIcon(brand: string) {
  const brandIcons = {
    Rolex: Watch,
    Hermès: Gem,
    Cartier: Crown,
    "Louis Vuitton": Gem,
    Chanel: Gem,
  };

  const IconComponent = brandIcons[brand as keyof typeof brandIcons] || Watch;
  return IconComponent;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const paymentsPerPage = 5;

  const { data: metrics, isLoading: metricsLoading } =
    useQuery<DashboardMetrics>({
      queryKey: ["/api/dashboard/metrics"],
    });

  const { data: recentItems, isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["/api/dashboard/recent-items"],
  });

  const { data: topPerforming, isLoading: performingLoading } = useQuery<
    TopPerformingItem[]
  >({
    queryKey: ["/api/dashboard/top-performing"],
  });

  const { data: recentPayments, isLoading: paymentsLoading } = useQuery<
    RecentPayment[]
  >({
    queryKey: ["/api/payments/recent"],
  });

  const { data: paymentMetrics, isLoading: paymentMetricsLoading } =
    useQuery<PaymentMetrics>({
      queryKey: ["/api/payments/metrics"],
    });

  const { data: luxetteInventory, isLoading: luxetteLoading } =
    useQuery<LuxetteInventoryData>({
      queryKey: ["/api/dashboard/luxette-inventory"],
    });

  // Revenue visualizer state
  const [dateRange, setDateRange] = useState("30");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const { data: financialData, isLoading: financialLoading } = useQuery<{
    totalRevenue: number;
    totalCosts: number;
    totalProfit: number;
    itemsSold: number;
    averageOrderValue: number;
    totalExpenses: number;
  }>({
    queryKey: [
      `/api/dashboard/financial-data?startDate=${startDate}&endDate=${endDate}`,
    ],
  });

  // Pagination logic for items
  const totalPages = Math.ceil((recentItems?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = recentItems?.slice(startIndex, endIndex) || [];

  // Pagination logic for payments
  const totalPaymentPages = Math.ceil(
    (recentPayments?.length || 0) / paymentsPerPage,
  );
  const paymentsStartIndex = (paymentsPage - 1) * paymentsPerPage;
  const paymentsEndIndex = paymentsStartIndex + paymentsPerPage;
  const currentPayments =
    recentPayments?.slice(paymentsStartIndex, paymentsEndIndex) || [];

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "add-item":
        setLocation("/inventory");
        break;
      case "record-payment":
        setLocation("/payments");
        break;
      case "process-payout":
        setLocation("/payouts");
        break;
      case "add-vendor":
        setLocation("/vendors");
        break;
    }
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case "7":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "365":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    setStartDate(startDate.toISOString().split("T")[0]);
    setEndDate(endDate.toISOString().split("T")[0]);
  };

  return (
    <MainLayout
      title="Panel Principal"
      subtitle="¡Bienvenido de vuelta! Aquí tienes lo que está pasando hoy"
    >
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ventas del Mes
                </p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrencyAbbreviated(metrics?.totalRevenue || 0)}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Productos en Venta
                </p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {metrics?.activeItems || 0}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Dinero Entrante
                </p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrencyAbbreviated(metrics?.incomingPayments || 0)}
                  </p>
                )}
                <p className="text-sm text-amber-600 mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Dinero Saliente:{" "}
                  {formatCurrencyAbbreviated(metrics?.upcomingPayouts || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Valor Mercancia
                </p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="text-xl font-bold text-foreground">
                    {metrics?.inventoryValueRange
                      ? formatCurrencyRangeAbbreviated(
                          metrics.inventoryValueRange.min,
                          metrics.inventoryValueRange.max,
                        )
                      : formatCurrencyAbbreviated(0)}
                  </p>
                )}

                <p className="text-sm text-emerald-600 mt-1 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  Costo Mercancia:{" "}
                  {metrics?.costRange
                    ? formatCurrencyRangeAbbreviated(
                        metrics.costRange.min,
                        metrics.costRange.max,
                      )
                    : formatCurrencyAbbreviated(0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Luxette Inventory Card */}
        <Card className="hover-lift" data-testid="card-luxette-inventory">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Inventario Luxette
                </p>
                {luxetteLoading ? (
                  <div className="space-y-2 mt-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ) : (
                  <div className="mt-2">
                    <p
                      className="text-2xl font-bold text-foreground"
                      data-testid="text-luxette-item-count"
                    >
                      {luxetteInventory?.itemCount || 0} artículos
                    </p>
                    <p
                      className="text-sm text-blue-600 mt-1"
                      data-testid="text-luxette-total-cost"
                    >
                      Costo Total:{" "}
                      {formatCurrencyAbbreviated(
                        luxetteInventory?.totalCost || 0,
                      )}
                    </p>
                    <p
                      className="text-sm text-green-600 mt-1"
                      data-testid="text-luxette-price-range"
                    >
                      Rango:{" "}
                      {luxetteInventory?.priceRange
                        ? formatCurrencyRangeAbbreviated(
                            luxetteInventory.priceRange.min,
                            luxetteInventory.priceRange.max,
                          )
                        : formatCurrencyAbbreviated(0)}
                    </p>
                  </div>
                )}
              </div>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Visualizer */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Resumen de Ingresos</CardTitle>
              <select
                className="text-sm border border-input rounded-lg px-3 py-2 bg-background"
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
              >
                <option value="7">Últimos 7 días</option>
                <option value="30">Últimos 30 días</option>
                <option value="90">Últimos 90 días</option>
                <option value="365">Últimos 12 meses</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {financialLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <Skeleton className="h-8 w-32 mx-auto" />
                  <Skeleton className="h-6 w-24 mx-auto" />
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Main Financial Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrencyAbbreviated(
                        financialData?.totalRevenue || 0,
                      )}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      Ingresos
                    </div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {formatCurrencyAbbreviated(
                        (financialData?.totalCosts || 0) +
                          (financialData?.totalExpenses || 0),
                      )}
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-400">
                      Costos Totales
                    </div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {formatCurrencyAbbreviated(
                        financialData?.totalProfit || 0,
                      )}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      Ganancia
                    </div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Artículos Vendidos:
                    </span>
                    <span className="font-semibold">
                      {financialData?.itemsSold || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Valor Promedio Orden:
                    </span>
                    <span className="font-semibold">
                      {formatCurrencyAbbreviated(
                        financialData?.averageOrderValue || 0,
                      )}
                    </span>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Costo Artículos:
                    </span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrencyAbbreviated(
                        financialData?.totalCosts || 0,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Gastos:
                    </span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrencyAbbreviated(
                        financialData?.totalExpenses || 0,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleQuickAction("add-item")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar Nuevo Artículo
              </Button>

              <Button
                className="w-full"
                variant="outline"
                size="lg"
                onClick={() => handleQuickAction("record-payment")}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Registrar Pago
              </Button>

              <Button
                className="w-full"
                variant="outline"
                size="lg"
                onClick={() => handleQuickAction("process-payout")}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Procesar Pago Saliente
              </Button>

              <Button
                className="w-full"
                variant="outline"
                size="lg"
                onClick={() => handleQuickAction("add-vendor")}
              >
                <Handshake className="mr-2 h-4 w-4" />
                Agregar Consignador
              </Button>
            </div>

            {/* Attention Required */}
            {paymentMetrics &&
              (paymentMetrics.overduePayments > 0 ||
                paymentMetrics.upcomingPayments > 0) && (
                <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <h4 className="font-medium text-destructive">
                      Atención Requerida
                    </h4>
                  </div>
                  <div className="space-y-1 text-sm text-destructive/80">
                    {paymentMetrics.overduePayments > 0 && (
                      <p>{paymentMetrics.overduePayments} pagos vencidos</p>
                    )}
                    {paymentMetrics.upcomingPayments > 0 && (
                      <p>{paymentMetrics.upcomingPayments} pagos próximos</p>
                    )}
                    {metrics &&
                      metrics.pendingPayouts &&
                      metrics.pendingPayouts.max > 0 && (
                        <p>
                          Pagos salientes pendientes:{" "}
                          {formatCurrencyRange(metrics.pendingPayouts)}
                        </p>
                      )}
                  </div>
                  <Button
                    variant="link"
                    className="mt-2 p-0 h-auto text-destructive"
                    onClick={() => handleQuickAction("record-payment")}
                  >
                    Revisar pagos →
                  </Button>
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8"></div>
    </MainLayout>
  );
}
