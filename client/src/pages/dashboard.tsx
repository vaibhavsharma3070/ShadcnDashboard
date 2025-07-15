import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";

interface DashboardMetrics {
  totalRevenue: number;
  activeItems: number;
  pendingPayouts: number;
  netProfit: number;
}

interface Item {
  itemId: string;
  title: string;
  brand: string;
  model: string;
  listPrice: string;
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30)
    return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? "s" : ""} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? "s" : ""} ago`;
}

function getStatusBadge(status: string) {
  const statusConfig = {
    "in-store": { label: "In Store", className: "status-in-store" },
    reserved: { label: "Reserved", className: "status-reserved" },
    sold: { label: "Sold", className: "status-sold" },
    returned: { label: "Returned", className: "status-returned" },
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

  return (
    <MainLayout
      title="Dashboard"
      subtitle="Welcome back, here's what's happening today!"
    >
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(metrics?.totalRevenue || 0)}
                  </p>
                )}
                <p className="text-sm text-emerald-600 mt-1 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  +12.5% from last month
                </p>
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
                  Active Items
                </p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {metrics?.activeItems || 0}
                  </p>
                )}
                <p className="text-sm text-blue-600 mt-1 flex items-center">
                  <Plus className="h-3 w-3 mr-1" />
                  23 new this week
                </p>
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
                  Pending Payouts
                </p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(metrics?.pendingPayouts || 0)}
                  </p>
                )}
                <p className="text-sm text-amber-600 mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  15 vendors waiting
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
                  Net Profit
                </p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(metrics?.netProfit || 0)}
                  </p>
                )}
                <p className="text-sm text-emerald-600 mt-1 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  35.5% margin
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Chart Placeholder */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Revenue Overview</CardTitle>
              <select className="text-sm border border-input rounded-lg px-3 py-2 bg-background">
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>Last 12 months</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  Revenue chart will be implemented here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Items */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performingLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-3">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="text-right space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))
              ) : topPerforming && topPerforming.length > 0 ? (
                topPerforming.map((item) => {
                  const IconComponent = getItemIcon(item.brand);
                  return (
                    <div
                      key={item.itemId}
                      className="flex items-center space-x-4 p-3 hover:bg-accent rounded-lg"
                    >
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">
                          {item.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {item.brand} • {item.model}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          {formatCurrency(item.profit)}
                        </p>
                        <p className="text-sm text-emerald-600">+15.2%</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No performance data available
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Activity feed will be implemented here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full" size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Add New Item
              </Button>

              <Button className="w-full" variant="outline" size="lg">
                <CreditCard className="mr-2 h-4 w-4" />
                Record Payment
              </Button>

              <Button className="w-full" variant="outline" size="lg">
                <DollarSign className="mr-2 h-4 w-4" />
                Process Payout
              </Button>

              <Button className="w-full" variant="outline" size="lg">
                <Handshake className="mr-2 h-4 w-4" />
                Add Vendor
              </Button>
            </div>

            {/* Pending Items Alert */}
            {metrics && metrics.pendingPayouts > 0 && (
              <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h4 className="font-medium text-destructive">
                    Attention Required
                  </h4>
                </div>
                <p className="text-sm text-destructive/80">
                  15 vendors are awaiting payouts totaling{" "}
                  {formatCurrency(metrics.pendingPayouts)}
                </p>
                <Button
                  variant="link"
                  className="mt-2 p-0 h-auto text-destructive"
                >
                  Review payouts →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Items Table */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Items</CardTitle>
            <div className="flex items-center space-x-3">
              <select className="text-sm border border-input rounded-lg px-3 py-2 bg-background">
                <option>All Status</option>
                <option>In Store</option>
                <option>Reserved</option>
                <option>Sold</option>
              </select>
              <Button variant="ghost" size="sm">
                View all inventory
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    Item
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    Vendor
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    List Price
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    Added
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {itemsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-10 h-10 rounded-lg" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="py-4 px-6">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="py-4 px-6">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="py-4 px-6">
                        <Skeleton className="h-8 w-16" />
                      </td>
                    </tr>
                  ))
                ) : recentItems && recentItems.length > 0 ? (
                  recentItems.map((item) => {
                    const IconComponent = getItemIcon(item.brand);
                    return (
                      <tr
                        key={item.itemId}
                        className="border-b border-border hover:bg-accent"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                              <IconComponent className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {item.title}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Model: {item.model}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm font-medium text-foreground">
                            {item.vendor.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.vendor.email}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-semibold text-foreground">
                            {formatCurrency(Number(item.listPrice))}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm text-muted-foreground">
                            {formatDate(item.createdAt)}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <Button variant="ghost" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
