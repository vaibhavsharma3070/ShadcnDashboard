import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, DollarSign, Activity } from 'lucide-react';

type ItemProfitability = {
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
  status?: string;
};

type KPIs = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  itemsSold: number;
  averageOrderValue: number;
  totalExpenses: number;
  netProfit: number;
  netMargin: number;
  pendingPayments: number;
  overduePayments: number;
  revenueChange: number;
  profitChange: number;
  topPerformingBrand: string;
  topPerformingVendor: string;
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);
}

export default function Profitability() {
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const buildParams = (extra?: Record<string, any>) => {
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    if (extra) Object.entries(extra).forEach(([k, v]) => params.append(k, String(v)));
    return params.toString();
  };

  const { data: kpis, isLoading: kpisLoading } = useQuery<KPIs>({
    queryKey: ['/api/reports/kpis', startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/reports/kpis?${buildParams()}`);
      if (!res.ok) throw new Error('Failed to load KPIs');
      return res.json();
    }
  });

  const { data: timeseries, isLoading: tsLoading } = useQuery<any[]>({
    queryKey: ['/api/reports/timeseries', startDate, endDate, granularity],
    queryFn: async () => {
      const params = buildParams({ granularity });
      const res = await fetch(`/api/reports/timeseries?${params}&metric=profit`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: itemsResponse, isLoading: itemsLoading } = useQuery<{ items: ItemProfitability[]; totalCount: number }>({
    queryKey: ['/api/reports/items', startDate, endDate, page],
    queryFn: async () => {
      const offset = (page - 1) * perPage;
      const params = buildParams({ limit: perPage, offset });
      const res = await fetch(`/api/reports/items?${params}`);
      if (!res.ok) throw new Error('Failed to load items');
      return res.json();
    }
  });

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams();
      params.append('reportType', 'profitability');
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      const res = await fetch(`/api/reports/export?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `profitability-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Export failed');
    }
  };

  return (
    <MainLayout title="Profitability" subtitle="Analyze profit margins and performance">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2"><DollarSign /> Profitability</CardTitle>
              <div className="flex items-center space-x-2">
                <Button onClick={exportCsv} variant="outline"><Download className="mr-2 h-4 w-4"/>Export CSV</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-sm text-muted-foreground">Start</label>
                <input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">End</label>
                <input type="date" value={endDate} max={new Date().toISOString().split('T')[0]} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Granularity</label>
                <Select onValueChange={(v: any) => setGranularity(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={granularity} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="col-span-1">
                <CardContent>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  {kpisLoading ? <Skeleton className="h-8 w-32" /> : <p className="text-2xl font-semibold">{formatCurrency(kpis?.revenue || 0)}</p>}
                  <p className="text-xs text-muted-foreground">Change {kpis ? `${kpis.revenueChange?.toFixed(1) || 0}%` : '—'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Gross Profit</p>
                  {kpisLoading ? <Skeleton className="h-8 w-32" /> : <p className="text-2xl font-semibold">{formatCurrency(kpis?.grossProfit || 0)}</p>}
                  <p className="text-xs text-muted-foreground">Margin {kpis ? `${kpis.grossMargin?.toFixed(1) || 0}%` : '—'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  {kpisLoading ? <Skeleton className="h-8 w-32" /> : <p className="text-2xl font-semibold">{formatCurrency(kpis?.netProfit || 0)}</p>}
                  <p className="text-xs text-muted-foreground">Expenses {formatCurrency(kpis?.totalExpenses || 0)}</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2"><Activity /> Profit Time Series</CardTitle>
            <div className="text-sm text-muted-foreground">Period: {startDate} — {endDate}</div>
          </CardHeader>
          <CardContent>
            {tsLoading ? (
              <div className="h-64"><Skeleton className="h-64" /></div>
            ) : (timeseries && timeseries.length > 0) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeseries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} name="Profit" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">No time series data. Try widening the date range.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Item Profitability</CardTitle>
              <Badge variant="outline">{itemsResponse?.totalCount || 0} items</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {itemsLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(itemsResponse?.items || []).map(item => (
                      <TableRow key={item.itemId}>
                        <TableCell>
                          <div className="truncate max-w-xs">
                            <div className="font-medium">{item.title}</div>
                            <div className="text-xs text-muted-foreground">{item.brand} • {item.model}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.vendor}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.profit)}</TableCell>
                        <TableCell className="text-right">{(item.margin || 0).toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* Pagination controls */}
                <div className="flex items-center justify-between mt-3">
                  <div className="text-sm text-muted-foreground">Showing {(page-1)*perPage + 1} — {Math.min(page*perPage, itemsResponse?.totalCount || 0)} of {itemsResponse?.totalCount || 0}</div>
                  <div className="space-x-2">
                    <Button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p-1))}>Previous</Button>
                    <Button disabled={(page * perPage) >= (itemsResponse?.totalCount || 0)} onClick={() => setPage(p => p+1)}>Next</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
