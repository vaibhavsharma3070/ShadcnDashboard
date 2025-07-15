import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search,
  DollarSign,
  TrendingUp,
  Calendar,
  Filter,
  Receipt,
  ShieldCheck,
  Camera,
  Sparkles,
  Shield,
  Car
} from "lucide-react";
import { ItemExpense, Item } from "@shared/schema";

interface ExpenseWithItem extends ItemExpense {
  item: Item;
}

function formatCurrency(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getExpenseTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'authentication':
      return <ShieldCheck className="h-4 w-4" />;
    case 'cleaning':
      return <Sparkles className="h-4 w-4" />;
    case 'photography':
      return <Camera className="h-4 w-4" />;
    case 'insurance':
      return <Shield className="h-4 w-4" />;
    case 'shipping':
      return <Car className="h-4 w-4" />;
    default:
      return <Receipt className="h-4 w-4" />;
  }
}

function getExpenseTypeBadge(type: string) {
  const colors = {
    authentication: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    cleaning: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    photography: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    insurance: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    shipping: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  };
  
  const colorClass = colors[type.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  
  return (
    <Badge variant="secondary" className={`${colorClass} flex items-center gap-1`}>
      {getExpenseTypeIcon(type)}
      {type}
    </Badge>
  );
}

export default function Expenses() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");

  const { data: expenses, isLoading } = useQuery<ExpenseWithItem[]>({
    queryKey: ['/api/expenses'],
    select: (data) => data || []
  });

  // Calculate metrics
  const totalExpenses = expenses?.length || 0;
  const totalAmount = expenses?.reduce((sum, expense) => sum + parseFloat(expense.amount), 0) || 0;
  const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;
  const thisMonthExpenses = expenses?.filter(expense => 
    new Date(expense.incurredAt).getMonth() === new Date().getMonth() &&
    new Date(expense.incurredAt).getFullYear() === new Date().getFullYear()
  ).length || 0;

  // Get unique expense types for filter
  const expenseTypes = Array.from(new Set(expenses?.map(e => e.expenseType) || []));

  // Filter and sort expenses
  const filteredExpenses = expenses?.filter(expense => {
    const matchesSearch = 
      expense.item.title?.toLowerCase().includes(search.toLowerCase()) ||
      expense.item.brand?.toLowerCase().includes(search.toLowerCase()) ||
      expense.expenseType.toLowerCase().includes(search.toLowerCase()) ||
      expense.notes?.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter === "all" || expense.expenseType === typeFilter;
    
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    switch (sortBy) {
      case "amount":
        return parseFloat(b.amount) - parseFloat(a.amount);
      case "type":
        return a.expenseType.localeCompare(b.expenseType);
      case "item":
        return (a.item.title || "").localeCompare(b.item.title || "");
      case "date":
      default:
        return new Date(b.incurredAt).getTime() - new Date(a.incurredAt).getTime();
    }
  }) || [];

  if (isLoading) {
    return (
      <MainLayout title="Expenses" subtitle="Track item-related expenses and costs">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Expenses" subtitle="Track item-related expenses and costs">
      <div className="space-y-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalExpenses}</div>
              <p className="text-xs text-muted-foreground">
                All time expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                Total expenses incurred
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(averageExpense)}</div>
              <p className="text-xs text-muted-foreground">
                Per expense average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{thisMonthExpenses}</div>
              <p className="text-xs text-muted-foreground">
                Expenses this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search expenses, items, or notes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {expenseTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date (Newest)</SelectItem>
                  <SelectItem value="amount">Amount (Highest)</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="item">Item</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Expense History</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
                <p className="text-muted-foreground">
                  {search || typeFilter !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "No expenses have been recorded yet"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.expenseId}>
                      <TableCell>
                        <div className="font-medium">
                          {formatDate(expense.incurredAt)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDateTime(expense.incurredAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{expense.item.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {expense.item.brand} {expense.item.model}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getExpenseTypeBadge(expense.expenseType)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(expense.amount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-md">
                          {expense.notes || "No notes"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
