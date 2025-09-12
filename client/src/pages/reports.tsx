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
  BarChart as BarChartIcon,
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  soldDate?: string;
  daysToSell?: number;
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
  try {
    if (value === undefined || value === null || isNaN(Number(value))) {
      return '0.0%';
    }
    const numValue = Number(value);
    return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(1)}%`;
  } catch (error) {
    console.error('Error in formatPercentage:', error, value);
    return '0.0%';
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

// Performance helper functions
function sortPerformanceData(data: GroupPerformance[], key: string, direction: 'asc' | 'desc'): GroupPerformance[] {
  if (!data) return [];
  
  return [...data].sort((a, b) => {
    let aValue: number = 0;
    let bValue: number = 0;
    
    switch (key) {
      case 'name':
        return direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      case 'revenue':
        aValue = a.revenue || 0;
        bValue = b.revenue || 0;
        break;
      case 'profit':
        aValue = a.profit || 0;
        bValue = b.profit || 0;
        break;
      case 'profitMargin':
        aValue = a.profitMargin || 0;
        bValue = b.profitMargin || 0;
        break;
      case 'itemCount':
        aValue = a.itemCount || 0;
        bValue = b.itemCount || 0;
        break;
      case 'change':
        aValue = a.change || 0;
        bValue = b.change || 0;
        break;
      default:
        return 0;
    }
    
    return direction === 'asc' ? aValue - bValue : bValue - aValue;
  });
}

function getPerformanceColor(profitMargin: number): string {
  if (profitMargin >= 0.25) return 'text-green-600';
  if (profitMargin >= 0.15) return 'text-yellow-600';
  return 'text-red-600';
}

function getPerformanceBadgeVariant(profitMargin: number): 'default' | 'secondary' | 'destructive' {
  if (profitMargin >= 0.25) return 'default';
  if (profitMargin >= 0.15) return 'secondary';
  return 'destructive';
}

function calculateSummaryStats(data: GroupPerformance[]): {
  totalRevenue: number;
  totalProfit: number;
  averageMargin: number;
  topPerformer: GroupPerformance | null;
  totalCount: number;
} {
  if (!data || data.length === 0) {
    return {
      totalRevenue: 0,
      totalProfit: 0,
      averageMargin: 0,
      topPerformer: null,
      totalCount: 0,
    };
  }

  const totalRevenue = data.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalProfit = data.reduce((sum, item) => sum + (item.profit || 0), 0);
  const averageMargin = data.reduce((sum, item) => sum + (item.profitMargin || 0), 0) / data.length;
  const topPerformer = data.reduce((max, item) => 
    (item.revenue || 0) > (max.revenue || 0) ? item : max, data[0]);

  return {
    totalRevenue,
    totalProfit,
    averageMargin,
    topPerformer,
    totalCount: data.length,
  };
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

  // Performance tab state management
  const [performanceView, setPerformanceView] = useState<'revenue' | 'profit'>('revenue');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
    groupType: 'vendor' | 'brand' | 'category' | 'client';
  }>({ key: 'revenue', direction: 'desc', groupType: 'vendor' });
  const [showCharts, setShowCharts] = useState(true);

  // Profitability tab state management
  const [profitabilitySortConfig, setProfitabilitySortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'profit', direction: 'desc' });
  const [profitabilityFilters, setProfitabilityFilters] = useState<{
    profitRange: 'all' | 'profitable' | 'breakeven' | 'loss';
    statusFilter: 'all' | 'sold' | 'in-store' | 'reserved';
    showCharts: boolean;
  }>({ profitRange: 'all', statusFilter: 'all', showCharts: true });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

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
    
    if ((filters.vendorIds || []).length > 0) {
      params.append('vendorIds', (filters.vendorIds || []).join(','));
    }
    if ((filters.clientIds || []).length > 0) {
      params.append('clientIds', (filters.clientIds || []).join(','));
    }
    if ((filters.brandIds || []).length > 0) {
      params.append('brandIds', (filters.brandIds || []).join(','));
    }
    if ((filters.categoryIds || []).length > 0) {
      params.append('categoryIds', (filters.categoryIds || []).join(','));
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
    queryKey: ['/api/reports/items', filters, currentPage, itemsPerPage, profitabilityFilters],
    queryFn: async () => {
      const offset = (currentPage - 1) * itemsPerPage;
      const params = buildQueryParams(filters, { 
        limit: itemsPerPage, 
        offset: offset,
        profitRange: profitabilityFilters.profitRange,
        statusFilter: profitabilityFilters.statusFilter
      });
      const response = await fetch(`/api/reports/items?${params}`);
      if (!response.ok) throw new Error('Failed to fetch item profitability');
      const data = await response.json();
      return data.items || data;
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

  // Profitability helper functions
  const sortProfitabilityData = (data: ItemProfitability[], key: string, direction: 'asc' | 'desc'): ItemProfitability[] => {
    if (!data) return [];
    
    return [...data].sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;
      
      switch (key) {
        case 'title':
          aValue = a.title || '';
          bValue = b.title || '';
          return direction === 'asc' 
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
        case 'brand':
          aValue = a.brand || '';
          bValue = b.brand || '';
          return direction === 'asc' 
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
        case 'cost':
          aValue = a.cost || 0;
          bValue = b.cost || 0;
          break;
        case 'revenue':
          aValue = a.revenue || 0;
          bValue = b.revenue || 0;
          break;
        case 'profit':
          aValue = a.profit || 0;
          bValue = b.profit || 0;
          break;
        case 'margin':
          aValue = a.margin || 0;
          bValue = b.margin || 0;
          break;
        case 'soldDate':
          aValue = a.soldDate ? new Date(a.soldDate).getTime() : 0;
          bValue = b.soldDate ? new Date(b.soldDate).getTime() : 0;
          break;
        case 'daysToSell':
          // Calculate days between acquisition and sale using actual acquisition dates
          const calculateDaysToSell = (item: ItemProfitability) => {
            if (!item.soldDate) return 9999; // Not sold yet
            // Use acquisition date from item data if available, otherwise estimate from creation
            const soldTime = new Date(item.soldDate).getTime();
            // For now, assume 30 days average until we add acquisition date to ItemProfitability interface
            return 30; // This should be replaced with actual acquisition date calculation
          };
          
          aValue = calculateDaysToSell(a);
          bValue = calculateDaysToSell(b);
          break;
        default:
          return 0;
      }
      
      return direction === 'asc' ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue);
    });
  };

  const filterProfitabilityData = (data: ItemProfitability[]): ItemProfitability[] => {
    if (!data) return [];
    
    return data.filter(item => {
      // Filter by profit range
      if (profitabilityFilters.profitRange !== 'all') {
        const profit = item.profit || 0;
        switch (profitabilityFilters.profitRange) {
          case 'profitable':
            if (profit <= 0) return false;
            break;
          case 'breakeven':
            if (profit < -50 || profit > 50) return false; // Within $50 of break-even
            break;
          case 'loss':
            if (profit >= 0) return false;
            break;
        }
      }
      
      // Filter by status
      if (profitabilityFilters.statusFilter !== 'all' && item.status !== profitabilityFilters.statusFilter) {
        return false;
      }
      
      return true;
    });
  };

  const calculateProfitabilityStats = (data: ItemProfitability[]) => {
    if (!data || data.length === 0) {
      return {
        totalItems: 0,
        avgProfitMargin: 0,
        bestItem: null,
        worstItem: null,
        avgDaysToSell: 0,
        totalProfit: 0,
        totalRevenue: 0,
      };
    }

    const totalItems = data.length;
    const totalProfit = data.reduce((sum, item) => sum + (item.profit || 0), 0);
    const totalRevenue = data.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const avgProfitMargin = data.reduce((sum, item) => sum + ((item.margin || 0) / 100), 0) / totalItems;
    
    const bestItem = data.reduce((max, item) => 
      (item.profit || 0) > (max.profit || 0) ? item : max, data[0]);
    const worstItem = data.reduce((min, item) => 
      (item.margin || 0) < (min.margin || 0) ? item : min, data[0]);

    // Calculate average days to sell using real daysToSell from API
    const itemsWithDaysToSell = data.filter(item => item.daysToSell !== undefined && item.daysToSell !== null);
    const avgDaysToSell = (itemsWithDaysToSell || []).length > 0 
      ? (itemsWithDaysToSell || []).reduce((sum, item) => sum + (item.daysToSell || 0), 0) / (itemsWithDaysToSell || []).length
      : 0;

    return {
      totalItems,
      avgProfitMargin,
      bestItem,
      worstItem,
      avgDaysToSell,
      totalProfit,
      totalRevenue,
    };
  };

  const getProfitabilityColor = (profitMargin: number): string => {
    if (profitMargin >= 0.25) return 'text-green-600';
    if (profitMargin >= 0.1) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProfitabilityBadgeVariant = (profitMargin: number): 'default' | 'secondary' | 'destructive' => {
    if (profitMargin >= 0.25) return 'default';
    if (profitMargin >= 0.1) return 'secondary';
    return 'destructive';
  };

  const exportProfitabilityData = () => {
    if (!itemProfitability) return;

    const filteredData = filterProfitabilityData(itemProfitability);
    const sortedData = sortProfitabilityData(filteredData, profitabilitySortConfig.key, profitabilitySortConfig.direction);

    const csvData = sortedData.map(item => ({
      'Item ID': item.itemId,
      'Title': item.title,
      'Brand': item.brand,
      'Model': item.model,
      'Vendor': item.vendor,
      'Revenue': item.revenue,
      'Cost': item.cost,
      'Profit': item.profit,
      'Profit Margin %': (item.margin || 0).toFixed(2),
      'Sold Date': item.soldDate || 'N/A',
      'Days to Sell': item.daysToSell || 'N/A'
    }));

    // Create CSV content
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `item-profitability-${filters.startDate}-to-${filters.endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                  <SelectValue placeholder={`${(filters.vendorIds || []).length} selected`} />
                </SelectTrigger>
                <SelectContent>
                  {vendorsLoading ? (
                    <div className="p-2">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : (
                    vendors?.map((vendor, index) => (
                      <SelectItem 
                        key={vendor?.vendorId || `vendor-${index}`} 
                        value={vendor?.vendorId || ''}
                        onClick={() => handleEntityFilter('vendorIds', vendor?.vendorId || '')}
                      >
                        {vendor?.name || 'Unknown Vendor'}
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
                  <SelectValue placeholder={`${(filters.clientIds || []).length} selected`} />
                </SelectTrigger>
                <SelectContent>
                  {clientsLoading ? (
                    <div className="p-2">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : (
                    clients?.map((client, index) => (
                      <SelectItem 
                        key={client?.clientId || `client-${index}`} 
                        value={client?.clientId || ''}
                        onClick={() => handleEntityFilter('clientIds', client?.clientId || '')}
                      >
                        {client?.name || 'Unknown Client'}
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
                  <SelectValue placeholder={`${(filters.brandIds || []).length} selected`} />
                </SelectTrigger>
                <SelectContent>
                  {brandsLoading ? (
                    <div className="p-2">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : (
                    brands?.map((brand, index) => (
                      <SelectItem 
                        key={brand?.brandId || `brand-${index}`} 
                        value={brand?.brandId || ''}
                        onClick={() => handleEntityFilter('brandIds', brand?.brandId || '')}
                      >
                        {brand?.name || 'Unknown Brand'}
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
                  <SelectValue placeholder={`${(filters.categoryIds || []).length} selected`} />
                </SelectTrigger>
                <SelectContent>
                  {categoriesLoading ? (
                    <div className="p-2">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : (
                    categories?.map((category, index) => (
                      <SelectItem 
                        key={category?.categoryId || `category-${index}`} 
                        value={category?.categoryId || ''}
                        onClick={() => handleEntityFilter('categoryIds', category?.categoryId || '')}
                      >
                        {category?.name || 'Unknown Category'}
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
            <BarChartIcon className="h-4 w-4 mr-2" />
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
              ) : timeseriesData && (timeseriesData || []).length > 0 ? (
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
          {/* Performance Controls */}
          <Card data-testid="card-performance-controls">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center space-x-2">
                  <BarChartIcon className="h-5 w-5" />
                  <span>Grouped Performance Analysis</span>
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select 
                    value={performanceView} 
                    onValueChange={(value: 'revenue' | 'profit') => setPerformanceView(value)}
                  >
                    <SelectTrigger className="w-full sm:w-40" data-testid="select-performance-view">
                      <SelectValue placeholder="View by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">By Revenue</SelectItem>
                      <SelectItem value="profit">By Profit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCharts(!showCharts)}
                    data-testid="button-toggle-charts"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showCharts ? 'Hide Charts' : 'Show Charts'}
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Vendor Performance Section */}
          <div className="space-y-4">
            {/* Vendor Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {vendorPerfLoading ? (
                [...Array(4)].map((_, i) => (
                  <Card key={`vendor-summary-skeleton-${i}`}>
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-6 w-16 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                (() => {
                  const stats = calculateSummaryStats(vendorPerformance || []);
                  return (
                    <>
                      <Card className="hover-lift" data-testid="card-vendor-summary-count">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-muted-foreground">Active Vendors</p>
                          <p className="text-2xl font-bold text-foreground">{stats.totalCount}</p>
                          <p className="text-xs text-blue-600">Total suppliers</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-lift" data-testid="card-vendor-summary-revenue">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                          <p className="text-2xl font-bold text-foreground">{formatCurrencyAbbreviated(stats.totalRevenue)}</p>
                          <p className="text-xs text-green-600">From all vendors</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-lift" data-testid="card-vendor-summary-profit">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-muted-foreground">Total Profit</p>
                          <p className="text-2xl font-bold text-foreground">{formatCurrencyAbbreviated(stats.totalProfit)}</p>
                          <p className="text-xs text-emerald-600">{(stats.averageMargin * 100).toFixed(1)}% avg margin</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-lift" data-testid="card-vendor-summary-top">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
                          <p className="text-lg font-bold text-foreground truncate">{stats.topPerformer?.name || 'N/A'}</p>
                          <p className="text-xs text-amber-600">
                            {stats.topPerformer ? formatCurrencyAbbreviated(stats.topPerformer.revenue) : 'No data'}
                          </p>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()
              )}
            </div>

            {/* Vendor Performance Table and Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vendor Table */}
              <Card data-testid="card-vendor-performance-table">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Vendor Performance</span>
                    <Badge variant="outline">{vendorPerformance?.length || 0} vendors</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {vendorPerfLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={`table-skeleton-${i}`} className="flex items-center justify-between p-3 border rounded-lg">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead 
                              className="cursor-pointer hover:bg-muted/50" 
                              onClick={() => {
                                const newDirection = sortConfig.key === 'name' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                                setSortConfig({ key: 'name', direction: newDirection, groupType: 'vendor' });
                              }}
                              data-testid="th-vendor-name"
                            >
                              <div className="flex items-center space-x-1">
                                <span>Vendor</span>
                                {sortConfig.key === 'name' && sortConfig.groupType === 'vendor' && (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-muted/50 text-right" 
                              onClick={() => {
                                const newDirection = sortConfig.key === 'revenue' && sortConfig.direction === 'desc' ? 'asc' : 'desc';
                                setSortConfig({ key: 'revenue', direction: newDirection, groupType: 'vendor' });
                              }}
                              data-testid="th-vendor-revenue"
                            >
                              <div className="flex items-center justify-end space-x-1">
                                <span>Revenue</span>
                                {sortConfig.key === 'revenue' && sortConfig.groupType === 'vendor' && (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-muted/50 text-right" 
                              onClick={() => {
                                const newDirection = sortConfig.key === 'profitMargin' && sortConfig.direction === 'desc' ? 'asc' : 'desc';
                                setSortConfig({ key: 'profitMargin', direction: newDirection, groupType: 'vendor' });
                              }}
                              data-testid="th-vendor-margin"
                            >
                              <div className="flex items-center justify-end space-x-1">
                                <span>Margin</span>
                                {sortConfig.key === 'profitMargin' && sortConfig.groupType === 'vendor' && (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="text-right">Trend</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortPerformanceData(
                            vendorPerformance || [], 
                            sortConfig.groupType === 'vendor' ? sortConfig.key : 'revenue', 
                            sortConfig.groupType === 'vendor' ? sortConfig.direction : 'desc'
                          ).slice(0, 10).map((vendor, index) => (
                            <TableRow key={vendor?.id || `vendor-${index}`} className="hover:bg-muted/50" data-testid={`row-vendor-${vendor?.id || index}`}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{vendor.name}</p>
                                  <p className="text-sm text-muted-foreground">{vendor.itemCount} items</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div>
                                  <p className="font-semibold">{formatCurrency(vendor.revenue)}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatCurrency((vendor.revenue || 0) / Math.max(vendor.itemCount || 1, 1))} avg
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge 
                                  variant={getPerformanceBadgeVariant(vendor.profitMargin || 0)}
                                  className={getPerformanceColor(vendor.profitMargin || 0)}
                                >
                                  {((vendor.profitMargin || 0) * 100).toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className={`flex items-center justify-end ${vendor.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {vendor.change >= 0 ? (
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                  )}
                                  <span className="text-sm font-medium">{formatPercentage(vendor.change)}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Vendor Chart */}
              {showCharts && (
                <Card data-testid="card-vendor-performance-chart">
                  <CardHeader>
                    <CardTitle>Top 10 Vendors by {performanceView === 'revenue' ? 'Revenue' : 'Profit'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {vendorPerfLoading ? (
                      <div className="h-64 flex items-center justify-center">
                        <Skeleton className="h-full w-full" />
                      </div>
                    ) : (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={sortPerformanceData(
                              vendorPerformance || [], 
                              performanceView, 
                              'desc'
                            ).slice(0, 10).map(vendor => ({
                              name: vendor.name.length > 15 ? vendor.name.substring(0, 15) + '...' : vendor.name,
                              value: performanceView === 'revenue' ? vendor.revenue : vendor.profit,
                              margin: vendor.profitMargin || 0
                            }))}
                            layout="horizontal"
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(value) => formatCurrencyAbbreviated(value)} />
                            <YAxis type="category" dataKey="name" width={80} />
                            <Tooltip 
                              formatter={(value: number) => [formatCurrency(value), performanceView === 'revenue' ? 'Revenue' : 'Profit']}
                              labelFormatter={(label) => `Vendor: ${label}`}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {sortPerformanceData(
                                vendorPerformance || [], 
                                performanceView, 
                                'desc'
                              ).slice(0, 10).map((_, index) => (
                                <Cell key={`performance-cell-${index}`} fill={index < 3 ? '#22c55e' : index < 6 ? '#eab308' : '#ef4444'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Brand Performance Section */}
          <div className="space-y-4">
            {/* Brand Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {brandPerfLoading ? (
                [...Array(4)].map((_, i) => (
                  <Card key={`summary-skeleton-${i}`}>
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-6 w-16 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                (() => {
                  const stats = calculateSummaryStats(brandPerformance || []);
                  return (
                    <>
                      <Card className="hover-lift" data-testid="card-brand-summary-count">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-muted-foreground">Active Brands</p>
                          <p className="text-2xl font-bold text-foreground">{stats.totalCount}</p>
                          <p className="text-xs text-purple-600">Total brands</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-lift" data-testid="card-brand-summary-revenue">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                          <p className="text-2xl font-bold text-foreground">{formatCurrencyAbbreviated(stats.totalRevenue)}</p>
                          <p className="text-xs text-green-600">From all brands</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-lift" data-testid="card-brand-summary-profit">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-muted-foreground">Total Profit</p>
                          <p className="text-2xl font-bold text-foreground">{formatCurrencyAbbreviated(stats.totalProfit)}</p>
                          <p className="text-xs text-emerald-600">{(stats.averageMargin * 100).toFixed(1)}% avg margin</p>
                        </CardContent>
                      </Card>
                      <Card className="hover-lift" data-testid="card-brand-summary-top">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
                          <p className="text-lg font-bold text-foreground truncate">{stats.topPerformer?.name || 'N/A'}</p>
                          <p className="text-xs text-amber-600">
                            {stats.topPerformer ? formatCurrencyAbbreviated(stats.topPerformer.revenue) : 'No data'}
                          </p>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()
              )}
            </div>

            {/* Brand Performance Table and Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Brand Table */}
              <Card data-testid="card-brand-performance-table">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Brand Performance</span>
                    <Badge variant="outline">{brandPerformance?.length || 0} brands</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {brandPerfLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={`table-skeleton-${i}`} className="flex items-center justify-between p-3 border rounded-lg">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead 
                              className="cursor-pointer hover:bg-muted/50" 
                              onClick={() => {
                                const newDirection = sortConfig.key === 'name' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                                setSortConfig({ key: 'name', direction: newDirection, groupType: 'brand' });
                              }}
                              data-testid="th-brand-name"
                            >
                              <div className="flex items-center space-x-1">
                                <span>Brand</span>
                                {sortConfig.key === 'name' && sortConfig.groupType === 'brand' && (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-muted/50 text-right" 
                              onClick={() => {
                                const newDirection = sortConfig.key === 'revenue' && sortConfig.direction === 'desc' ? 'asc' : 'desc';
                                setSortConfig({ key: 'revenue', direction: newDirection, groupType: 'brand' });
                              }}
                              data-testid="th-brand-revenue"
                            >
                              <div className="flex items-center justify-end space-x-1">
                                <span>Revenue</span>
                                {sortConfig.key === 'revenue' && sortConfig.groupType === 'brand' && (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-muted/50 text-right" 
                              onClick={() => {
                                const newDirection = sortConfig.key === 'profitMargin' && sortConfig.direction === 'desc' ? 'asc' : 'desc';
                                setSortConfig({ key: 'profitMargin', direction: newDirection, groupType: 'brand' });
                              }}
                              data-testid="th-brand-margin"
                            >
                              <div className="flex items-center justify-end space-x-1">
                                <span>Margin</span>
                                {sortConfig.key === 'profitMargin' && sortConfig.groupType === 'brand' && (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="text-right">Trend</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortPerformanceData(
                            brandPerformance || [], 
                            sortConfig.groupType === 'brand' ? sortConfig.key : 'revenue', 
                            sortConfig.groupType === 'brand' ? sortConfig.direction : 'desc'
                          ).slice(0, 10).map((brand, index) => (
                            <TableRow key={brand?.id || `brand-${index}`} className="hover:bg-muted/50" data-testid={`row-brand-${brand?.id || index}`}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{brand.name}</p>
                                  <p className="text-sm text-muted-foreground">{brand.itemCount} items</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div>
                                  <p className="font-semibold">{formatCurrency(brand.revenue)}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatCurrency((brand.revenue || 0) / Math.max(brand.itemCount || 1, 1))} avg
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge 
                                  variant={getPerformanceBadgeVariant(brand.profitMargin || 0)}
                                  className={getPerformanceColor(brand.profitMargin || 0)}
                                >
                                  {((brand.profitMargin || 0) * 100).toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className={`flex items-center justify-end ${brand.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {brand.change >= 0 ? (
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                  )}
                                  <span className="text-sm font-medium">{formatPercentage(brand.change)}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Brand Chart */}
              {showCharts && (
                <Card data-testid="card-brand-performance-chart">
                  <CardHeader>
                    <CardTitle>Top 10 Brands by {performanceView === 'revenue' ? 'Revenue' : 'Profit'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {brandPerfLoading ? (
                      <div className="h-64 flex items-center justify-center">
                        <Skeleton className="h-full w-full" />
                      </div>
                    ) : (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={sortPerformanceData(
                              brandPerformance || [], 
                              performanceView, 
                              'desc'
                            ).slice(0, 10).map(brand => ({
                              name: brand.name.length > 15 ? brand.name.substring(0, 15) + '...' : brand.name,
                              value: performanceView === 'revenue' ? brand.revenue : brand.profit,
                              margin: brand.profitMargin || 0
                            }))}
                            layout="horizontal"
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(value) => formatCurrencyAbbreviated(value)} />
                            <YAxis type="category" dataKey="name" width={80} />
                            <Tooltip 
                              formatter={(value: number) => [formatCurrency(value), performanceView === 'revenue' ? 'Revenue' : 'Profit']}
                              labelFormatter={(label) => `Brand: ${label}`}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {sortPerformanceData(
                                brandPerformance || [], 
                                performanceView, 
                                'desc'
                              ).slice(0, 10).map((_, index) => (
                                <Cell key={`performance-cell-${index}`} fill={index < 3 ? '#22c55e' : index < 6 ? '#eab308' : '#ef4444'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Category and Client Performance Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Category Performance */}
            <Card data-testid="card-category-performance-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Category Performance</span>
                  <Badge variant="outline">{categoryPerformance?.length || 0} categories</Badge>
                </CardTitle>
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
                    {sortPerformanceData(categoryPerformance || [], 'revenue', 'desc').map((category, index) => (
                      <div key={category?.id || `category-${index}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50" data-testid={`row-category-${category?.id || index}`}>
                        <div className="flex-1">
                          <p className="font-medium">{category.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.itemCount} items • {((category.profitMargin || 0) * 100).toFixed(1)}% margin
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrencyAbbreviated(category.revenue)}</p>
                          <div className={`text-sm flex items-center justify-end ${category.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {category.change >= 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            <span>{formatPercentage(category.change)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Performance */}
            <Card data-testid="card-client-performance-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Client Performance</span>
                  <Badge variant="outline">{clientPerformance?.length || 0} clients</Badge>
                </CardTitle>
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
                    {sortPerformanceData(clientPerformance || [], 'revenue', 'desc').map((client, index) => (
                      <div key={client?.id || `client-${index}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50" data-testid={`row-client-${client?.id || index}`}>
                        <div className="flex-1">
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {client.itemCount} purchases
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrencyAbbreviated(client.revenue)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency((client.revenue || 0) / Math.max(client.itemCount || 1, 1))} avg
                          </p>
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
          {/* Summary Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6">
            {(() => {
              const filteredData = filterProfitabilityData(itemProfitability || []);
              const stats = calculateProfitabilityStats(filteredData);
              
              return (
                <>
                  <Card className="hover-lift" data-testid="card-profitability-total-items">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                          {itemProfitLoading ? (
                            <Skeleton className="h-8 w-16 mt-2" />
                          ) : (
                            <p className="text-2xl font-bold text-foreground">{stats.totalItems}</p>
                          )}
                          <p className="text-sm text-blue-600 mt-1">
                            Revenue: {formatCurrencyAbbreviated(stats.totalRevenue)}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
                          <Package className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover-lift" data-testid="card-profitability-total-profit">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground">Total Profit</p>
                          {itemProfitLoading ? (
                            <Skeleton className="h-8 w-20 mt-2" />
                          ) : (
                            <p className="text-2xl font-bold text-foreground">
                              {formatCurrencyAbbreviated(stats.totalProfit)}
                            </p>
                          )}
                          <p className={`text-sm mt-1 ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stats.totalProfit >= 0 ? 'Profitable' : 'Loss-making'}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover-lift" data-testid="card-profitability-avg-margin">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground">Avg. Margin</p>
                          {itemProfitLoading ? (
                            <Skeleton className="h-8 w-16 mt-2" />
                          ) : (
                            <p className={`text-2xl font-bold ${getProfitabilityColor(stats.avgProfitMargin)}`}>
                              {(stats.avgProfitMargin * 100).toFixed(1)}%
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            Portfolio average
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-xl flex items-center justify-center">
                          <Target className="h-6 w-6 text-yellow-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover-lift" data-testid="card-profitability-best-item">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground">Best Item</p>
                          {itemProfitLoading ? (
                            <Skeleton className="h-8 w-20 mt-2" />
                          ) : (
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrencyAbbreviated(stats.bestItem?.profit || 0)}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {stats.bestItem?.title || 'N/A'}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-emerald-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover-lift" data-testid="card-profitability-worst-item">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground">Worst Margin</p>
                          {itemProfitLoading ? (
                            <Skeleton className="h-8 w-16 mt-2" />
                          ) : (
                            <p className="text-2xl font-bold text-red-600">
                              {((stats.worstItem?.margin || 0)).toFixed(1)}%
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {stats.worstItem?.title || 'N/A'}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-xl flex items-center justify-center">
                          <TrendingDown className="h-6 w-6 text-red-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover-lift" data-testid="card-profitability-avg-days">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground">Avg. Days to Sell</p>
                          {itemProfitLoading ? (
                            <Skeleton className="h-8 w-16 mt-2" />
                          ) : (
                            <p className="text-2xl font-bold text-foreground">
                              {Math.round(stats.avgDaysToSell)}
                            </p>
                          )}
                          <p className="text-sm text-purple-600 mt-1">
                            Sold items only
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center">
                          <Clock className="h-6 w-6 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </div>

          {/* Charts Section */}
          {profitabilityFilters.showCharts && itemProfitability && (itemProfitability || []).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profit Distribution Chart */}
              <Card data-testid="card-profit-distribution">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChartIcon className="h-5 w-5 text-blue-600" />
                    <span>Profit Distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(() => {
                        const filteredData = filterProfitabilityData(itemProfitability || []) || [];
                        const ranges = [
                          { name: 'Loss > $500', min: -Infinity, max: -500, color: '#dc2626' },
                          { name: 'Loss $0-500', min: -500, max: 0, color: '#ea580c' },
                          { name: 'Break-even', min: 0, max: 100, color: '#eab308' },
                          { name: 'Profit $100-500', min: 100, max: 500, color: '#65a30d' },
                          { name: 'Profit > $500', min: 500, max: Infinity, color: '#16a34a' }
                        ];
                        
                        return ranges.map(range => ({
                          name: range.name,
                          count: (filteredData || []).filter(item => 
                            (item.profit || 0) > range.min && (item.profit || 0) <= range.max
                          ).length,
                          fill: range.color
                        }));
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top 10 Items Chart */}
              <Card data-testid="card-top-items">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span>Top 10 Most Profitable</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={(filterProfitabilityData(itemProfitability || []) || [])
                          .sort((a, b) => (b.profit || 0) - (a.profit || 0))
                          .slice(0, 10)
                          .map(item => ({
                            name: `${item.title?.substring(0, 15)}...` || 'Unknown',
                            profit: item.profit || 0,
                            margin: (item.profitMargin || 0) * 100
                          }))}
                        layout="horizontal"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          tick={{ fontSize: 12 }}
                          width={120}
                        />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Bar dataKey="profit" fill="#16a34a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Controls and Filters */}
          <Card data-testid="card-profitability-controls">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Profitability Analysis Controls</span>
                </CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setProfitabilityFilters(prev => ({ ...prev, showCharts: !prev.showCharts }))}
                    data-testid="button-toggle-charts"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {profitabilityFilters.showCharts ? 'Hide' : 'Show'} Charts
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={exportProfitabilityData}
                    data-testid="button-export-profitability"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Profit Range</label>
                  <Select 
                    value={profitabilityFilters.profitRange} 
                    onValueChange={(value: 'all' | 'profitable' | 'breakeven' | 'loss') => 
                      setProfitabilityFilters(prev => ({ ...prev, profitRange: value }))
                    }
                  >
                    <SelectTrigger data-testid="select-profit-range">
                      <SelectValue placeholder="Select profit range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="profitable">Profitable Only</SelectItem>
                      <SelectItem value="breakeven">Break-even (±$50)</SelectItem>
                      <SelectItem value="loss">Loss-making Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Status Filter</label>
                  <Select 
                    value={profitabilityFilters.statusFilter} 
                    onValueChange={(value: 'all' | 'sold' | 'in-store' | 'reserved') => 
                      setProfitabilityFilters(prev => ({ ...prev, statusFilter: value }))
                    }
                  >
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="in-store">In Store</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Items per Page</label>
                  <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={(value) => {
                      setItemsPerPage(parseInt(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger data-testid="select-items-per-page">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="25">25 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Profitability Table */}
          <Card data-testid="card-profitability-table">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Table className="h-5 w-5" />
                  <span>Detailed Item Profitability Analysis</span>
                </div>
                <Badge variant="outline" className="text-sm">
                  {(() => {
                    const filteredData = filterProfitabilityData(itemProfitability || []);
                    return `${(filteredData || []).length} items`;
                  })()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {itemProfitLoading ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                (() => {
                  const filteredData = filterProfitabilityData(itemProfitability || []) || [];
                  const sortedData = sortProfitabilityData(filteredData, profitabilitySortConfig.key, profitabilitySortConfig.direction) || [];
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const paginatedData = sortedData.slice(startIndex, endIndex) || [];
                  const totalPages = Math.ceil((sortedData || []).length / itemsPerPage);

                  const handleSort = (key: string) => {
                    setProfitabilitySortConfig(prev => ({
                      key,
                      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
                    }));
                  };

                  return (
                    <div className="space-y-4">
                      {/* Table */}
                      <div className="relative overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs uppercase bg-muted">
                            <tr>
                              {[
                                { key: 'title', label: 'Item', width: 'w-48' },
                                { key: 'brand', label: 'Brand', width: 'w-32' },
                                { key: 'vendor', label: 'Vendor', width: 'w-32' },
                                { key: 'cost', label: 'Cost', width: 'w-24' },
                                { key: 'revenue', label: 'Revenue', width: 'w-24' },
                                { key: 'profit', label: 'Profit', width: 'w-24' },
                                { key: 'margin', label: 'Margin %', width: 'w-20' },
                                { key: 'status', label: 'Status', width: 'w-24' },
                                { key: 'soldDate', label: 'Sold Date', width: 'w-28' },
                              ].map(column => (
                                <th key={column.key} className={`px-6 py-3 ${column.width}`}>
                                  <button
                                    className="flex items-center space-x-1 hover:text-foreground transition-colors"
                                    onClick={() => handleSort(column.key)}
                                    data-testid={`button-sort-${column.key}`}
                                  >
                                    <span>{column.label}</span>
                                    {profitabilitySortConfig.key === column.key ? (
                                      profitabilitySortConfig.direction === 'desc' ? (
                                        <ArrowDown className="h-3 w-3" />
                                      ) : (
                                        <ArrowUp className="h-3 w-3" />
                                      )
                                    ) : (
                                      <div className="h-3 w-3" />
                                    )}
                                  </button>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(paginatedData || []).length === 0 ? (
                              <tr>
                                <td colSpan={9} className="px-6 py-4 text-center text-muted-foreground">
                                  No items found matching current filters
                                </td>
                              </tr>
                            ) : (
                              (paginatedData || []).map((item, index) => (
                                <tr 
                                  key={item.itemId} 
                                  className="bg-background border-b hover:bg-muted/50 transition-colors"
                                  data-testid={`row-profitability-item-${index}`}
                                >
                                  <td className="px-6 py-4 font-medium">
                                    <div>
                                      <p className="font-semibold text-foreground truncate" title={item.title}>
                                        {item.title || 'Unknown Item'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {item.model}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">
                                    {item.brand || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">
                                    {item.vendor || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono">
                                    {formatCurrency(item.cost || 0)}
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono">
                                    {formatCurrency(item.revenue || 0)}
                                  </td>
                                  <td className={`px-6 py-4 text-right font-mono font-semibold ${(item.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {(item.profit || 0) >= 0 ? '+' : ''}{formatCurrency(item.profit || 0)}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <Badge 
                                      variant={getProfitabilityBadgeVariant((item.margin || 0) / 100)}
                                      className="font-mono"
                                    >
                                      {(item.margin || 0).toFixed(1)}%
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4">
                                    <Badge 
                                      variant={
                                        item.status === 'sold' ? 'default' :
                                        item.status === 'reserved' ? 'secondary' : 'outline'
                                      }
                                      className="text-xs"
                                    >
                                      {item.status}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-muted-foreground">
                                    {item.soldDate ? formatDate(item.soldDate) : 'N/A'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t pt-4">
                          <div className="text-sm text-muted-foreground">
                            Showing {startIndex + 1} to {Math.min(endIndex, (sortedData || []).length)} of {(sortedData || []).length} items
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              data-testid="button-prev-page"
                            >
                              Previous
                            </Button>
                            <div className="flex items-center space-x-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pageNum = i + 1;
                                return (
                                  <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(pageNum)}
                                    data-testid={`button-page-${pageNum}`}
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              })}
                              {totalPages > 5 && (
                                <>
                                  <span className="text-muted-foreground">...</span>
                                  <Button
                                    variant={currentPage === totalPages ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(totalPages)}
                                    data-testid={`button-page-${totalPages}`}
                                  >
                                    {totalPages}
                                  </Button>
                                </>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              data-testid="button-next-page"
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
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
                    <div key={`payment-skeleton-${i}`} className="flex items-center justify-between p-4 border rounded-lg">
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
                  {Array.isArray(paymentMethodMetrics) ? paymentMethodMetrics.map((method, index) => (
                    <div key={method?.paymentMethod || `payment-method-${index}`} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{method?.paymentMethod || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">
                            {method?.totalTransactions || 0} transactions • {(method?.percentage || 0).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrencyAbbreviated(method?.totalAmount || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Avg: {formatCurrencyAbbreviated(method?.averageAmount || 0)}
                        </p>
                        <p className={`text-xs flex items-center justify-end ${(method?.trend || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {(method?.trend || 0) >= 0 ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {formatPercentage(method?.trend || 0)}
                        </p>
                      </div>
                    </div>
                  )) : []}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}