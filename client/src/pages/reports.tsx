import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart,
  Calendar,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Users,
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ArrowUp,
  ArrowDown,
  ShoppingCart,
  Activity,
  Target,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Vendor, Client, Brand, Category } from "@shared/schema";

// TypeScript interfaces for report data structures
interface FilterState {
  startDate: string;
  endDate: string;
  granularity: 'day' | 'week' | 'month';
  vendorIds: string[];
  clientIds: string[];
  brandIds: string[];
  categoryIds: string[];
}

interface OverviewMetrics {
  totalRevenue: number;
  totalProfit: number;
  totalItems: number;
  totalExpenses: number;
  averageProfit: number;
  profitMargin: number;
  itemsSold: number;
  pendingPayments: number;
  overduePayments: number;
  revenueChange: number;
  profitChange: number;
  topPerformingBrand: string;
  topPerformingVendor: string;
}

interface GroupPerformance {
  id: string;
  name: string;
  revenue: number;
  profit: number;
  itemCount: number;
  profitMargin: number;
  change: number;
}

interface ItemProfitability {
  itemId: string;
  title: string;
  brand: string;
  model: string;
  vendor: string;
  cost: number;
  salePrice: number;
  profit: number;
  profitMargin: number;
  status: string;
  soldDate?: string;
}

interface InventoryHealthMetrics {
  totalItems: number;
  inStoreItems: number;
  reservedItems: number;
  soldItems: number;
  returnedItems: number;
  totalValue: number;
  averageAge: number;
  slowMovingItems: number;
  fastMovingItems: number;
}

interface InventoryAging {
  ageRange: string;
  itemCount: number;
  totalValue: number;
  percentage: number;
}

interface PaymentMethodMetrics {
  paymentMethod: string;
  totalTransactions: number;
  totalAmount: number;
  averageAmount: number;
  percentage: number;
  trend: number;
}

interface TimeseriesDataPoint {
  date: string;
  revenue: number;
  profit: number;
  itemsSold: number;
  expenses: number;
}

// Utility functions
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatCurrencyAbbreviated(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  } else {
    return formatCurrency(amount);
  }
}

function formatPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return '0.0%';
  }
  const numValue = Number(value);
  return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(1)}%`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

export default function Reports() {
  // State management
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState<FilterState>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    granularity: 'day',
    vendorIds: [],
    clientIds: [],
    brandIds: [],
    categoryIds: [],
  });

  // Filter entity data queries
  const { data: vendors, isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: brands, isLoading: brandsLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Helper function to build query parameters from filters
  const buildQueryParams = (filters: FilterState, additionalParams?: Record<string, any>) => {
    const params = new URLSearchParams();
    params.append('startDate', filters.startDate);
    params.append('endDate', filters.endDate);
    
    if (filters.vendorIds.length > 0) {
      params.append('vendorIds', filters.vendorIds.join(','));
    }
    if (filters.clientIds.length > 0) {
      params.append('clientIds', filters.clientIds.join(','));
    }
    if (filters.brandIds.length > 0) {
      params.append('brandIds', filters.brandIds.join(','));
    }
    if (filters.categoryIds.length > 0) {
      params.append('categoryIds', filters.categoryIds.join(','));
    }
    
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    return params.toString();
  };

  // Report data queries
  const { data: overviewMetrics, isLoading: overviewLoading } = useQuery<OverviewMetrics>({
    queryKey: ['/api/reports/kpis', filters],
    queryFn: async () => {
      const params = buildQueryParams(filters);
      const response = await fetch(`/api/reports/kpis?${params}`);
      if (!response.ok) throw new Error('Failed to fetch overview metrics');
      return response.json();
    },
    enabled: activeTab === 'overview',
  });

  const { data: vendorPerformance, isLoading: vendorPerfLoading } = useQuery<GroupPerformance[]>({
    queryKey: ['/api/reports/grouped', { groupBy: 'vendor', ...filters }],
    queryFn: async () => {
      const params = buildQueryParams(filters, { groupBy: 'vendor', metrics: 'revenue,profit,itemsSold' });
      const response = await fetch(`/api/reports/grouped?${params}`);
      if (!response.ok) throw new Error('Failed to fetch vendor performance');
      return response.json();
    },
    enabled: activeTab === 'performance',
  });

  const { data: brandPerformance, isLoading: brandPerfLoading } = useQuery<GroupPerformance[]>({
    queryKey: ['/api/reports/grouped', { groupBy: 'brand', ...filters }],
    queryFn: async () => {
      const params = buildQueryParams(filters, { groupBy: 'brand', metrics: 'revenue,profit,itemsSold' });
      const response = await fetch(`/api/reports/grouped?${params}`);
      if (!response.ok) throw new Error('Failed to fetch brand performance');
      return response.json();
    },
    enabled: activeTab === 'performance',
  });

  const { data: categoryPerformance, isLoading: categoryPerfLoading } = useQuery<GroupPerformance[]>({
    queryKey: ['/api/reports/grouped', { groupBy: 'category', ...filters }],
    queryFn: async () => {
      const params = buildQueryParams(filters, { groupBy: 'category', metrics: 'revenue,profit,itemsSold' });
      const response = await fetch(`/api/reports/grouped?${params}`);
      if (!response.ok) throw new Error('Failed to fetch category performance');
      return response.json();
    },
    enabled: activeTab === 'performance',
  });

  const { data: clientPerformance, isLoading: clientPerfLoading } = useQuery<GroupPerformance[]>({
    queryKey: ['/api/reports/grouped', { groupBy: 'client', ...filters }],
    queryFn: async () => {
      const params = buildQueryParams(filters, { groupBy: 'client', metrics: 'revenue,profit,itemsSold' });
      const response = await fetch(`/api/reports/grouped?${params}`);
      if (!response.ok) throw new Error('Failed to fetch client performance');
      return response.json();
    },
    enabled: activeTab === 'performance',
  });

  const { data: itemProfitability, isLoading: itemProfitLoading } = useQuery<ItemProfitability[]>({
    queryKey: ['/api/reports/items', filters],
    queryFn: async () => {
      const params = buildQueryParams(filters, { limit: 50, offset: 0 });
      const response = await fetch(`/api/reports/items?${params}`);
      if (!response.ok) throw new Error('Failed to fetch item profitability');
      return response.json();
    },
    enabled: activeTab === 'profitability',
  });

  const { data: inventoryHealth, isLoading: inventoryHealthLoading } = useQuery<InventoryHealthMetrics>({
    queryKey: ['/api/reports/inventory', { type: 'health', ...filters }],
    queryFn: async () => {
      const params = buildQueryParams(filters);
      const response = await fetch(`/api/reports/inventory?${params}`);
      if (!response.ok) throw new Error('Failed to fetch inventory health');
      const data = await response.json();
      // Extract health metrics from response
      return {
        totalItems: data.totalItems || 0,
        inStoreItems: data.inStoreItems || 0,
        reservedItems: data.reservedItems || 0,
        soldItems: data.soldItems || 0,
        returnedItems: data.returnedItems || 0,
        totalValue: data.totalValue || 0,
        averageAge: data.averageAge || 0,
        slowMovingItems: data.slowMovingItems || 0,
        fastMovingItems: data.fastMovingItems || 0,
      };
    },
    enabled: activeTab === 'inventory',
  });

  const { data: inventoryAging, isLoading: inventoryAgingLoading } = useQuery<InventoryAging[]>({
    queryKey: ['/api/reports/inventory', { type: 'aging', ...filters }],
    queryFn: async () => {
      const params = buildQueryParams(filters);
      const response = await fetch(`/api/reports/inventory?${params}`);
      if (!response.ok) throw new Error('Failed to fetch inventory aging');
      const data = await response.json();
      // Extract aging data from response
      return data.aging || [];
    },
    enabled: activeTab === 'inventory',
  });

  const { data: paymentMethodMetrics, isLoading: paymentMethodLoading } = useQuery<PaymentMethodMetrics[]>({
    queryKey: ['/api/reports/payment-methods', filters],
    queryFn: async () => {
      const params = buildQueryParams(filters);
      const response = await fetch(`/api/reports/payment-methods?${params}`);
      if (!response.ok) throw new Error('Failed to fetch payment methods');
      return response.json();
    },
    enabled: activeTab === 'payments',
  });

  const { data: timeseriesData, isLoading: timeseriesLoading, error: timeseriesError } = useQuery<TimeseriesDataPoint[]>({
    queryKey: ['/api/reports/timeseries', filters],
    queryFn: async () => {
      const params = buildQueryParams(filters, { granularity: filters.granularity });
      const response = await fetch(`/api/reports/timeseries?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch timeseries data: ${response.status}`);
      }
      return response.json();
    },
    enabled: activeTab === 'overview',
    retry: (failureCount, error) => {
      // Don't retry on client errors (400s)
      if (error?.message?.includes('400') || error?.message?.includes('Invalid query parameters')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Filter handlers
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleEntityFilter = (entityType: 'vendorIds' | 'clientIds' | 'brandIds' | 'categoryIds', value: string) => {
    setFilters(prev => {
      const currentValues = prev[entityType];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(id => id !== value)
        : [...currentValues, value];
      return { ...prev, [entityType]: newValues };
    });
  };

  const resetFilters = () => {
    setFilters({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      granularity: 'day',
      vendorIds: [],
      clientIds: [],
      brandIds: [],
      categoryIds: [],
    });
  };

  const exportReport = () => {
    console.log("Export functionality will be implemented");
  };

  return (
    <MainLayout
      title="Reports & Analytics"
      subtitle="Comprehensive business intelligence and reporting dashboard"
    >
      {/* Filter Controls Bar */}
      <Card className="mb-6" data-testid="card-filter-controls">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Report Filters</span>
            </CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={resetFilters} data-testid="button-reset-filters">
                Reset Filters
              </Button>
              <Button variant="outline" size="sm" onClick={exportReport} data-testid="button-export-report">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Start Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">End Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                data-testid="input-end-date"
              />
            </div>

            {/* Granularity */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Granularity</label>
              <Select value={filters.granularity} onValueChange={(value: 'day' | 'week' | 'month') => handleFilterChange('granularity', value)}>
                <SelectTrigger data-testid="select-granularity">
                  <SelectValue placeholder="Select granularity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Entity Filters */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Vendors</label>
              <Select>
                <SelectTrigger data-testid="select-vendors">
                  <SelectValue placeholder={`${filters.vendorIds.length} selected`} />
                </SelectTrigger>
                <SelectContent>
                  {vendorsLoading ? (
                    <div className="p-2">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : (
                    vendors?.map((vendor) => (
                      <SelectItem 
                        key={vendor.vendorId} 
                        value={vendor.vendorId}
                        onClick={() => handleEntityFilter('vendorIds', vendor.vendorId)}
                      >
                        {vendor.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Clients</label>
              <Select>
                <SelectTrigger data-testid="select-clients">
                  <SelectValue placeholder={`${filters.clientIds.length} selected`} />
                </SelectTrigger>
                <SelectContent>
                  {clientsLoading ? (
                    <div className="p-2">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : (
                    clients?.map((client) => (
                      <SelectItem 
                        key={client.clientId} 
                        value={client.clientId}
                        onClick={() => handleEntityFilter('clientIds', client.clientId)}
                      >
                        {client.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Brands</label>
              <Select>
                <SelectTrigger data-testid="select-brands">
                  <SelectValue placeholder={`${filters.brandIds.length} selected`} />
                </SelectTrigger>
                <SelectContent>
                  {brandsLoading ? (
                    <div className="p-2">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : (
                    brands?.map((brand) => (
                      <SelectItem 
                        key={brand.brandId} 
                        value={brand.brandId}
                        onClick={() => handleEntityFilter('brandIds', brand.brandId)}
                      >
                        {brand.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Categories</label>
              <Select>
                <SelectTrigger data-testid="select-categories">
                  <SelectValue placeholder={`${filters.categoryIds.length} selected`} />
                </SelectTrigger>
                <SelectContent>
                  {categoriesLoading ? (
                    <div className="p-2">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : (
                    categories?.map((category) => (
                      <SelectItem 
                        key={category.categoryId} 
                        value={category.categoryId}
                        onClick={() => handleEntityFilter('categoryIds', category.categoryId)}
                      >
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">
            <BarChart className="h-4 w-4 mr-2" />
            Performance by Groups
          </TabsTrigger>
          <TabsTrigger value="profitability" data-testid="tab-profitability">
            <DollarSign className="h-4 w-4 mr-2" />
            Item Profitability
          </TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory">
            <Package className="h-4 w-4 mr-2" />
            Inventory Health
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            <CreditCard className="h-4 w-4 mr-2" />
            Payment Method Audit
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Enhanced KPI Tiles Grid - Mobile responsive: 1 col on mobile, 2 on tablet, 3 on laptop, 6 on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6">
            {/* Revenue Card */}
            <Card className="hover-lift" data-testid="card-overview-revenue">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    {overviewLoading ? (
                      <Skeleton className="h-8 w-24 mt-2" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrencyAbbreviated(overviewMetrics?.totalRevenue || 0)}
                      </p>
                    )}
                    <div className={`text-sm mt-1 flex items-center ${(overviewMetrics?.revenueChange || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {(overviewMetrics?.revenueChange || 0) >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      <span className="font-medium">{formatPercentage(overviewMetrics?.revenueChange || 0)}</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* COGS Card */}
            <Card className="hover-lift" data-testid="card-overview-cogs">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Cost of Goods Sold</p>
                    {overviewLoading ? (
                      <Skeleton className="h-8 w-24 mt-2" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrencyAbbreviated(((overviewMetrics?.totalRevenue || 0) - (overviewMetrics?.totalProfit || 0)))}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {(((((overviewMetrics?.totalRevenue || 0) - (overviewMetrics?.totalProfit || 0)) / (overviewMetrics?.totalRevenue || 1)) * 100).toFixed(1))}% of revenue
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gross Profit Card */}
            <Card className="hover-lift" data-testid="card-overview-gross-profit">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Gross Profit</p>
                    {overviewLoading ? (
                      <Skeleton className="h-8 w-24 mt-2" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrencyAbbreviated(overviewMetrics?.totalProfit || 0)}
                      </p>
                    )}
                    <div className={`text-sm mt-1 flex items-center ${(overviewMetrics?.profitChange || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {(overviewMetrics?.profitChange || 0) >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      <span className="font-medium">{formatPercentage(overviewMetrics?.profitChange || 0)}</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Net Margin Card */}
            <Card className="hover-lift" data-testid="card-overview-net-margin">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Net Margin</p>
                    {overviewLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">
                        {(((overviewMetrics?.totalProfit || 0) - (overviewMetrics?.totalExpenses || 0)) / (overviewMetrics?.totalRevenue || 1) * 100).toFixed(1)}%
                      </p>
                    )}
                    <p className="text-sm text-amber-600 mt-1">
                      After expenses: {formatCurrencyAbbreviated((overviewMetrics?.totalProfit || 0) - (overviewMetrics?.totalExpenses || 0))}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-xl flex items-center justify-center">
                    <Target className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Sold Card */}
            <Card className="hover-lift" data-testid="card-overview-items-sold">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Items Sold</p>
                    {overviewLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">
                        {overviewMetrics?.itemsSold || 0}
                      </p>
                    )}
                    <p className="text-sm text-purple-600 mt-1">
                      {formatCurrencyAbbreviated((overviewMetrics?.totalRevenue || 0) / (overviewMetrics?.itemsSold || 1))} avg. value
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center">
                    <Package className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Activity Card */}
            <Card className="hover-lift" data-testid="card-overview-payments">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                    {overviewLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">
                        {(overviewMetrics?.pendingPayments || 0) + (overviewMetrics?.overduePayments || 0)}
                      </p>
                    )}
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-orange-600 text-xs">
                        {overviewMetrics?.pendingPayments || 0} pending
                      </Badge>
                      {(overviewMetrics?.overduePayments || 0) > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {overviewMetrics?.overduePayments || 0} overdue
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-xl flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Summary Cards - Mobile responsive */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <Card data-testid="card-overview-top-performers">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Top Performers</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Best Brand</p>
                    <p className="font-semibold text-foreground">{overviewMetrics?.topPerformingBrand || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Best Vendor</p>
                    <p className="font-semibold text-foreground">{overviewMetrics?.topPerformingVendor || 'N/A'}</p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Performance Period</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(filters.startDate)} - {formatDate(filters.endDate)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-overview-inventory-status">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span>Inventory Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Items</span>
                    <span className="font-semibold text-foreground">{overviewMetrics?.totalItems || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Items Sold</span>
                    <span className="font-semibold text-emerald-600">{overviewMetrics?.itemsSold || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Available</span>
                    <span className="font-semibold text-blue-600">{(overviewMetrics?.totalItems || 0) - (overviewMetrics?.itemsSold || 0)}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Turnover Rate</span>
                      <span className="text-sm font-medium text-foreground">
                        {(((overviewMetrics?.itemsSold || 0) / (overviewMetrics?.totalItems || 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-overview-expenses-breakdown">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span>Expenses Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrencyAbbreviated(overviewMetrics?.totalExpenses || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total expenses for period
                    </p>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">% of Revenue</span>
                      <span className="text-sm font-medium text-red-600">
                        {(((overviewMetrics?.totalExpenses || 0) / (overviewMetrics?.totalRevenue || 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-muted-foreground">Net Profit Impact</span>
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrencyAbbreviated((overviewMetrics?.totalProfit || 0) - (overviewMetrics?.totalExpenses || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time-Series Chart */}
          <Card data-testid="card-timeseries-chart">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <span>Revenue & Profit Trends</span>
              </CardTitle>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Granularity: {filters.granularity}</span>
                <Badge variant="outline" className="text-xs">
                  {timeseriesData?.length || 0} data points
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {timeseriesLoading ? (
                <div className="h-80 w-full flex items-center justify-center">
                  <div className="space-y-4 w-full">
                    <Skeleton className="h-6 w-48 mx-auto" />
                    <Skeleton className="h-64 w-full rounded-lg" />
                    <div className="flex justify-center space-x-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </div>
              ) : timeseriesError ? (
                <div className="h-80 w-full flex items-center justify-center bg-red-50 dark:bg-red-950/20 rounded-lg border-2 border-dashed border-red-200 dark:border-red-800">
                  <div className="text-center space-y-3">
                    <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-red-700 dark:text-red-400">
                        Failed to Load Chart Data
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-500 max-w-md">
                        {timeseriesError?.message || 'Unable to fetch timeseries data. Please try adjusting your filters or contact support if the issue persists.'}
                      </p>
                    </div>
                    <div className="text-xs text-red-500 space-y-1">
                      <p>Period: {formatDate(filters.startDate)} - {formatDate(filters.endDate)}</p>
                      <p>Granularity: {filters.granularity}</p>
                    </div>
                  </div>
                </div>
              ) : timeseriesData && timeseriesData.length > 0 ? (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeseriesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        className="text-muted-foreground text-xs"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          if (filters.granularity === 'day') {
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          } else if (filters.granularity === 'week') {
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          } else {
                            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                          }
                        }}
                      />
                      <YAxis 
                        className="text-muted-foreground text-xs"
                        tickFormatter={(value) => formatCurrencyAbbreviated(value)}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                          color: 'hsl(var(--card-foreground))'
                        }}
                        formatter={(value: number, name: string) => [
                          formatCurrency(value),
                          name === 'revenue' ? 'Revenue' : 
                          name === 'profit' ? 'Profit' :
                          name === 'expenses' ? 'Expenses' : 'Items Sold'
                        ]}
                        labelFormatter={(label) => formatDate(label)}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          paddingTop: '20px',
                          fontSize: '12px'
                        }}
                        formatter={(value) => (
                          <span className="text-muted-foreground">
                            {value === 'revenue' ? 'Revenue' : 
                             value === 'profit' ? 'Profit' :
                             value === 'expenses' ? 'Expenses' : 'Items Sold'}
                          </span>
                        )}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--chart-1, #10b981))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--chart-1, #10b981))', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: 'hsl(var(--chart-1, #10b981))', strokeWidth: 2, fill: 'white' }}
                        name="revenue"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="profit" 
                        stroke="hsl(var(--chart-2, #3b82f6))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--chart-2, #3b82f6))', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: 'hsl(var(--chart-2, #3b82f6))', strokeWidth: 2, fill: 'white' }}
                        name="profit"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expenses" 
                        stroke="hsl(var(--chart-3, #ef4444))" 
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ fill: 'hsl(var(--chart-3, #ef4444))', strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5, stroke: 'hsl(var(--chart-3, #ef4444))', strokeWidth: 2, fill: 'white' }}
                        name="expenses"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 w-full flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-muted">
                  <div className="text-center space-y-3">
                    <Activity className="h-16 w-16 text-muted-foreground mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-muted-foreground">
                        No Data Available
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Try adjusting your date range or filters
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Period: {formatDate(filters.startDate)} - {formatDate(filters.endDate)}</p>
                      <p>Granularity: {filters.granularity}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance by Groups Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vendor Performance */}
            <Card data-testid="card-vendor-performance">
              <CardHeader>
                <CardTitle>Vendor Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {vendorPerfLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vendorPerformance?.slice(0, 5).map((vendor) => (
                      <div key={vendor.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div className="flex-1">
                          <p className="font-medium">{vendor.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {vendor.itemCount} items • {((vendor.profitMargin || 0) * 100).toFixed(1)}% margin
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrencyAbbreviated(vendor.revenue)}</p>
                          <p className={`text-sm flex items-center ${vendor.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {vendor.change >= 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {formatPercentage(vendor.change)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Brand Performance */}
            <Card data-testid="card-brand-performance">
              <CardHeader>
                <CardTitle>Brand Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {brandPerfLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {brandPerformance?.slice(0, 5).map((brand) => (
                      <div key={brand.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div className="flex-1">
                          <p className="font-medium">{brand.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {brand.itemCount} items • {((brand.profitMargin || 0) * 100).toFixed(1)}% margin
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrencyAbbreviated(brand.revenue)}</p>
                          <p className={`text-sm flex items-center ${brand.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {brand.change >= 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {formatPercentage(brand.change)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Performance */}
            <Card data-testid="card-category-performance">
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryPerfLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categoryPerformance?.slice(0, 3).map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div className="flex-1">
                          <p className="font-medium">{category.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.itemCount} items • {((category.profitMargin || 0) * 100).toFixed(1)}% margin
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrencyAbbreviated(category.revenue)}</p>
                          <p className={`text-sm flex items-center ${category.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {category.change >= 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {formatPercentage(category.change)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Performance */}
            <Card data-testid="card-client-performance">
              <CardHeader>
                <CardTitle>Client Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {clientPerfLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientPerformance?.slice(0, 3).map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div className="flex-1">
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {client.itemCount} purchases
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrencyAbbreviated(client.revenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Item Profitability Tab */}
        <TabsContent value="profitability" className="space-y-6">
          <Card data-testid="card-item-profitability">
            <CardHeader>
              <CardTitle>Most Profitable Items</CardTitle>
            </CardHeader>
            <CardContent>
              {itemProfitLoading ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {itemProfitability?.slice(0, 10).map((item) => (
                    <div key={item.itemId} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50">
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.brand} {item.model} • {item.vendor}
                          {item.soldDate && (
                            <span> • Sold {formatDate(item.soldDate)}</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-semibold text-green-600">
                          +{formatCurrencyAbbreviated(item.profit)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {((item.profitMargin || 0) * 100).toFixed(1)}% margin
                        </p>
                      </div>
                      <Badge 
                        variant={item.status === 'sold' ? 'default' : 'outline'}
                        className="ml-2"
                      >
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Health Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover-lift" data-testid="card-inventory-total">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                    {inventoryHealthLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">
                        {inventoryHealth?.totalItems || 0}
                      </p>
                    )}
                    <p className="text-sm text-blue-600 mt-1">
                      Value: {formatCurrencyAbbreviated(inventoryHealth?.totalValue || 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift" data-testid="card-inventory-sold">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sold Items</p>
                    {inventoryHealthLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">
                        {inventoryHealth?.soldItems || 0}
                      </p>
                    )}
                    <p className="text-sm text-green-600 mt-1">
                      {inventoryHealth?.totalItems ? 
                        (((inventoryHealth.soldItems || 0) / inventoryHealth.totalItems) * 100).toFixed(1) : 0}% sold
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift" data-testid="card-inventory-instore">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">In Store</p>
                    {inventoryHealthLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">
                        {inventoryHealth?.inStoreItems || 0}
                      </p>
                    )}
                    <p className="text-sm text-amber-600 mt-1">
                      Reserved: {inventoryHealth?.reservedItems || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift" data-testid="card-inventory-age">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average Age</p>
                    {inventoryHealthLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">
                        {Math.round(inventoryHealth?.averageAge || 0)} days
                      </p>
                    )}
                    <p className="text-sm text-red-600 mt-1">
                      Slow: {inventoryHealth?.slowMovingItems || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Inventory Aging Analysis */}
          <Card data-testid="card-inventory-aging">
            <CardHeader>
              <CardTitle>Inventory Aging Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {inventoryAgingLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <Skeleton className="h-4 w-32" />
                      <div className="flex space-x-4">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {inventoryAging?.map((aging, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div>
                        <p className="font-medium">{aging.ageRange}</p>
                        <p className="text-sm text-muted-foreground">
                          {aging.percentage.toFixed(1)}% of total inventory
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{aging.itemCount} items</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrencyAbbreviated(aging.totalValue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card data-testid="card-payment-methods">
            <CardHeader>
              <CardTitle>Payment Method Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentMethodLoading ? (
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentMethodMetrics?.map((method) => (
                    <div key={method.paymentMethod} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{method.paymentMethod}</p>
                          <p className="text-sm text-muted-foreground">
                            {method.totalTransactions} transactions • {method.percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrencyAbbreviated(method.totalAmount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Avg: {formatCurrencyAbbreviated(method.averageAmount)}
                        </p>
                        <p className={`text-xs flex items-center justify-end ${method.trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {method.trend >= 0 ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {formatPercentage(method.trend)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}