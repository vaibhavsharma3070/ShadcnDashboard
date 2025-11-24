import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  Car,
  Plus,
  Building2,
  SquarePen,
  Trash2,
  Package
} from "lucide-react";
import { ItemExpense, Item, insertItemExpenseSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ExpenseWithItem extends ItemExpense {
  item: Item | null;
}

// Schema for expenses (with optional item)
const expenseSchema = z.object({
  itemId: z.string().optional().nullable(),
  expenseType: z.string().min(1, "Expense type is required"),
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number"
  }),
  incurredAt: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

// Common business expense types
const BUSINESS_EXPENSE_TYPES = [
  "Payroll",
  "Rent", 
  "Electricity",
  "Internet",
  "Phone",
  "Office Supplies",
  "Insurance",
  "Legal Fees",
  "Accounting",
  "Marketing",
  "Software Subscriptions",
  "Equipment Maintenance",
  "Travel",
  "Authentication",
  "Cleaning",
  "Photography",
  "Shipping",
  "Other"
];

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
  const colors: Record<string, string> = {
    authentication: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    cleaning: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    photography: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    insurance: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    shipping: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  };
  
  const colorClass = colors[type.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  
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
  const [itemFilter, setItemFilter] = useState<string>("all"); // "all", "with-item", "general"
  const [sortBy, setSortBy] = useState<string>("date");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithItem | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  
  const { toast } = useToast();

  const { data: expenses, isLoading } = useQuery<ExpenseWithItem[]>({
    queryKey: ['/api/expenses'],
    select: (data) => data || []
  });

  // Fetch items for the dropdown
  const { data: items } = useQuery<Item[]>({
    queryKey: ['/api/items'],
    select: (data) => data || []
  });

  // Form for expenses
  const expenseForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      itemId: null,
      expenseType: "",
      amount: "",
      incurredAt: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  // Mutation for creating expenses
  const createExpenseMutation = useMutation({
    mutationFn: (data: ExpenseFormData) => {
      const expenseData = {
        itemId: data.itemId || null,
        expenseType: data.expenseType,
        amount: parseFloat(data.amount),
        incurredAt: new Date(data.incurredAt).toISOString(),
        notes: data.notes || "",
      };
      return apiRequest('POST', '/api/expenses', expenseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      setIsExpenseModalOpen(false);
      setEditingExpense(null);
      expenseForm.reset();
      toast({
        title: "Success",
        description: "Expense recorded successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating expense:', error);
      toast({
        title: "Error", 
        description: "Failed to record expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating expense
  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseFormData }) => {
      const expenseData = {
        itemId: data.itemId || null,
        expenseType: data.expenseType,
        amount: parseFloat(data.amount),
        incurredAt: new Date(data.incurredAt).toISOString(),
        notes: data.notes || "",
      };
      return apiRequest('PUT', `/api/expenses/${id}`, expenseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      setIsExpenseModalOpen(false);
      setEditingExpense(null);
      expenseForm.reset();
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating expense:', error);
      toast({
        title: "Error", 
        description: "Failed to update expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting expense
  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => {
      return apiRequest('DELETE', `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      setDeleteExpenseId(null);
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error", 
        description: "Failed to delete expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onExpenseSubmit = (data: ExpenseFormData) => {
    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.expenseId, data });
    } else {
      createExpenseMutation.mutate(data);
    }
  };

  const handleEditExpense = (expense: ExpenseWithItem) => {
    setEditingExpense(expense);
    const incurredDate = new Date(expense.incurredAt);
    expenseForm.reset({
      itemId: expense.itemId || null,
      expenseType: expense.expenseType,
      amount: expense.amount.toString(),
      incurredAt: incurredDate.toISOString().split('T')[0],
      notes: expense.notes || "",
    });
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = (expenseId: string) => {
    setDeleteExpenseId(expenseId);
  };

  const confirmDeleteExpense = () => {
    if (deleteExpenseId) {
      deleteExpenseMutation.mutate(deleteExpenseId);
    }
  };

  const handleModalClose = (open: boolean) => {
    setIsExpenseModalOpen(open);
    if (!open) {
      setEditingExpense(null);
      expenseForm.reset();
    }
  };

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
  const filteredExpenses = expenses
    ?.filter((expense) => {
      const searchLower = search.toLowerCase();

      const matchesSearch =
        expense.expenseType.toLowerCase().includes(searchLower) ||
        expense.notes?.toLowerCase().includes(searchLower) ||
        expense.item?.title?.toLowerCase().includes(searchLower) ||
        expense.item?.model?.toLowerCase().includes(searchLower);

      const matchesType =
        typeFilter === "all" || expense.expenseType === typeFilter;

      const matchesItemFilter =
        itemFilter === "all" ||
        (itemFilter === "with-item" && expense.itemId) ||
        (itemFilter === "general" && !expense.itemId);

      return matchesSearch && matchesType && matchesItemFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "amount":
          return parseFloat(b.amount) - parseFloat(a.amount);
        case "type":
          return a.expenseType.localeCompare(b.expenseType);
        case "date":
        default:
          return (
            new Date(b.incurredAt).getTime() -
            new Date(a.incurredAt).getTime()
          );
      }
    }) || [];


  if (isLoading) {
    return (
      <MainLayout title="Expenses" subtitle="Track item-related and general business expenses">
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
    <MainLayout title="Expenses" subtitle="Track item-related and general business expenses">
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

              <Select value={itemFilter} onValueChange={setItemFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Expenses</SelectItem>
                  <SelectItem value="with-item">Item Expenses</SelectItem>
                  <SelectItem value="general">General Business</SelectItem>
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
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Expense History</CardTitle>
              <Dialog open={isExpenseModalOpen} onOpenChange={handleModalClose}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-expense">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      {editingExpense ? "Update Expense" : "Record New Expense"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...expenseForm}>
                    <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-4">
                      <FormField
                        control={expenseForm.control}
                        name="itemId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item (Optional)</FormLabel>
                            <FormControl>
                              <Select 
                                value={field.value || "none"} 
                                onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                              >
                                <SelectTrigger data-testid="select-item">
                                  <SelectValue placeholder="Select item (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4" />
                                      General Business Expense
                                    </div>
                                  </SelectItem>
                                  {items?.filter(i => i.status === 'in-store').map(item => (
                                    <SelectItem key={item.itemId} value={item.itemId}>
                                      <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        {item.title || item.model || 'Unnamed Item'}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={expenseForm.control}
                        name="expenseType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expense Type</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger data-testid="select-expense-type">
                                  <SelectValue placeholder="Select expense type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {BUSINESS_EXPENSE_TYPES.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={expenseForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                data-testid="input-amount"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={expenseForm.control}
                        name="incurredAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                data-testid="input-date"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={expenseForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Additional notes..."
                                data-testid="input-notes"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => handleModalClose(false)}
                          data-testid="button-cancel-expense"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                          data-testid="button-submit-expense"
                        >
                          {createExpenseMutation.isPending || updateExpenseMutation.isPending
                            ? (editingExpense ? "Updating..." : "Recording...") 
                            : (editingExpense ? "Update Expense" : "Record Expense")}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
                <p className="text-muted-foreground">
                  {search || typeFilter !== "all" || itemFilter !== "all"
                    ? "Try adjusting your search or filters" 
                    : "No expenses have been recorded yet"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.expenseId}>
                      <TableCell>
                        <div className="font-medium">
                          {formatDate(expense.incurredAt.toString())}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDateTime(expense.incurredAt.toString())}
                        </div>
                      </TableCell>

                      <TableCell>{getExpenseTypeBadge(expense.expenseType)}</TableCell>

                      <TableCell>
                        {expense.item ? (
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">
                                {expense.item.title || expense.item.model || 'Unnamed Item'}
                              </div>
                              {expense.item.serialNo && (
                                <div className="text-xs text-muted-foreground">
                                  S/N: {expense.item.serialNo}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span className="text-sm">General Business</span>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(expense.amount)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-md truncate">
                          {expense.notes || "No notes"}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditExpense(expense)}
                            data-testid={`button-edit-${expense.expenseId}`}
                          >
                            <SquarePen className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.expenseId)}
                            data-testid={`button-delete-${expense.expenseId}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteExpenseId} onOpenChange={() => setDeleteExpenseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteExpense}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}