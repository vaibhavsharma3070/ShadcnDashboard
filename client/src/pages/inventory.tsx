import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertItemSchema,
  insertClientPaymentSchema,
  type Item,
  type Vendor,
  type Client,
} from "@shared/schema";
import { StatusUpdateDropdown } from "@/components/status-update-dropdown";
import { z } from "zod";
import {
  Package,
  Plus,
  Search,
  Filter,
  SortAsc,
  Eye,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  User,
  Tag,
  Watch,
  Gem,
  Crown,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ShoppingCart,
  CreditCard,
  X,
  MoreVertical,
} from "lucide-react";

type ItemWithVendor = Item & { vendor: Vendor };

// Helper for numeric field preprocessing
const toOptionalNumber = z.preprocess(
  (v) => (v === "" || v == null) ? undefined : (typeof v === "string" ? Number(v) : v),
  z.number().nonnegative().optional()
);

const itemFormSchema = insertItemSchema.extend({
  vendorId: z.string().min(1, "Vendor is required"),
  title: z.string().min(1, "Title is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  minCost: toOptionalNumber,
  maxCost: toOptionalNumber,
  minSalesPrice: toOptionalNumber,
  maxSalesPrice: toOptionalNumber,
  acquisitionDate: z.string().min(1, "Acquisition date is required"),
}).refine((data) => {
  // Validate that min <= max for cost range
  if (data.minCost !== undefined && data.maxCost !== undefined) {
    return data.minCost <= data.maxCost;
  }
  return true;
}, {
  message: "Minimum cost cannot be greater than maximum cost",
  path: ["maxCost"],
}).refine((data) => {
  // Validate that min <= max for sales price range  
  if (data.minSalesPrice !== undefined && data.maxSalesPrice !== undefined) {
    return data.minSalesPrice <= data.maxSalesPrice;
  }
  return true;
}, {
  message: "Minimum sales price cannot be greater than maximum sales price",
  path: ["maxSalesPrice"],
});

// Create a function to generate the sale form schema with item context
const saleFormSchema = z
  .object({
    clientId: z.string().min(1, "Client is required"),
    paymentType: z.enum(["full", "installment"]),
    amount: z.string().min(1, "Amount is required"),
    paymentMethod: z.string().min(1, "Payment method is required"),
    installments: z
      .array(
        z.object({
          amount: z.string().optional(),
          dueDate: z.string().optional(),
        }),
      )
      .optional(),
  })
  .refine(
    (data) => {
      if (data.paymentType === "installment") {
        // Only validate installments if payment type is installment
        if (!data.installments || data.installments.length === 0) {
          return false;
        }
        // Check that all installments have required fields
        return data.installments.every(
          (inst) =>
            inst.amount &&
            inst.amount.length > 0 &&
            inst.dueDate &&
            inst.dueDate.length > 0,
        );
      }
      return true;
    },
    {
      message: "Please provide all installment amounts and due dates",
      path: ["installments"],
    },
  );

// Create a base type for sale form data
type SaleFormData = {
  clientId: string;
  paymentType: "full" | "installment";
  amount: string;
  paymentMethod: string;
  installments?: Array<{
    amount?: string;
    dueDate?: string;
  }>;
};

type ItemFormData = z.infer<typeof itemFormSchema>;

function formatCurrency(amount: number | string) {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numAmount || 0);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusBadge(status: string) {
  const statusConfig = {
    "in-store": {
      label: "In Store",
      className: "status-in-store",
      icon: Package,
    },
    reserved: {
      label: "Reserved",
      className: "status-reserved",
      icon: AlertCircle,
    },
    sold: { label: "Sold", className: "status-sold", icon: CheckCircle },
    returned: {
      label: "Returned",
      className: "status-returned",
      icon: AlertCircle,
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] ||
    statusConfig["in-store"];
  const IconComponent = config.icon;

  return (
    <Badge variant="outline" className={`status-badge ${config.className}`}>
      <IconComponent className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function getItemIcon(brand: string) {
  const brandIcons = {
    Rolex: Watch,
    Omega: Watch,
    "Patek Philippe": Watch,
    Hermès: Gem,
    Cartier: Crown,
    "Louis Vuitton": Gem,
    Chanel: Gem,
    Gucci: Gem,
    Prada: Gem,
    Bulgari: Gem,
  };

  return brandIcons[brand as keyof typeof brandIcons] || Watch;
}

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemWithVendor | null>(null);
  const [installments, setInstallments] = useState([
    { amount: "", dueDate: "" },
  ]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading: itemsLoading } = useQuery<ItemWithVendor[]>({
    queryKey: ["/api/items"],
  });

  const { data: vendors, isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/items", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/dashboard/recent-items"],
      });
      setIsCreateModalOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Item created successfully",
      });
    },
    onError: (error: any) => {
      console.error("Create item error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create item",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest("DELETE", `/api/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/dashboard/recent-items"],
      });
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const createSaleMutation = useMutation({
    mutationFn: async (data: SaleFormData) => {
      if (data.paymentType === "full") {
        // Create a single payment for full payment
        const paymentPayload = {
          itemId: selectedItem?.itemId,
          clientId: data.clientId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          paidAt: new Date().toISOString(),
        };

        const paymentResult = await apiRequest(
          "POST",
          "/api/payments",
          paymentPayload,
        );

        // Update item status to "sold" for full payment
        const statusPayload = { status: "sold" };
        await apiRequest(
          "PUT",
          `/api/items/${selectedItem?.itemId}`,
          statusPayload,
        );

        return paymentResult;
      } else {
        // Create installment plan
        if (!data.installments || data.installments.length === 0) {
          throw new Error("Installments are required for installment payment");
        }

        // Update item status to "reserved" for installment plan
        const statusPayload = { status: "reserved" };
        await apiRequest(
          "PUT",
          `/api/items/${selectedItem?.itemId}`,
          statusPayload,
        );

        // Create the first payment (if amount > 0)
        if (data.amount && parseFloat(data.amount) > 0) {
          const paymentPayload = {
            itemId: selectedItem?.itemId,
            clientId: data.clientId,
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            paidAt: new Date().toISOString(),
          };

          await apiRequest("POST", "/api/payments", paymentPayload);
        }

        // Create installment plans for future payments
        const installmentPromises = data.installments.map((installment) => {
          const installmentPayload = {
            itemId: selectedItem?.itemId,
            clientId: data.clientId,
            amount: installment.amount,
            dueDate: installment.dueDate,
          };

          return apiRequest(
            "POST",
            "/api/installment-plans",
            installmentPayload,
          );
        });

        const installmentResults = await Promise.all(installmentPromises);
        return installmentResults;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/installment-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setIsSaleModalOpen(false);
      setSelectedItem(null);
      setInstallments([{ amount: "", dueDate: "" }]);
      saleForm.reset();
      toast({
        title: "Success",
        description: "Sale recorded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to record sale",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      vendorId: "",
      title: "",
      brand: "",
      model: "",
      serialNo: "",
      condition: "",
      minCost: undefined,
      maxCost: undefined,
      minSalesPrice: undefined,
      maxSalesPrice: undefined,
      acquisitionDate: "",
      status: "in-store",
    },
  });

  const saleForm = useForm<SaleFormData>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      clientId: "",
      paymentType: "full",
      amount: "",
      paymentMethod: "cash",
      installments: [{ amount: "", dueDate: "" }],
    },
  });

  const onSubmit = (data: ItemFormData) => {
    const payload = {
      ...data,
      serialNo: data.serialNo || undefined,
      condition: data.condition || undefined,
    };
    createItemMutation.mutate(payload);
  };

  const onSaleSubmit = (data: SaleFormData) => {
    if (!selectedItem?.itemId) {
      toast({
        title: "Error",
        description: "No item selected for sale",
        variant: "destructive",
      });
      return;
    }


    const formData = {
      ...data,
      installments:
        data.paymentType === "installment" ? installments : undefined,
    };

    createSaleMutation.mutate(formData);
  };

  const addInstallment = () => {
    const newInstallments = [...installments, { amount: "", dueDate: "" }];
    setInstallments(newInstallments);
    saleForm.setValue("installments", newInstallments);
  };

  const removeInstallment = (index: number) => {
    if (installments.length > 1) {
      const newInstallments = installments.filter((_, i) => i !== index);
      setInstallments(newInstallments);
      saleForm.setValue("installments", newInstallments);
    }
  };

  const updateInstallment = (
    index: number,
    field: "amount" | "dueDate",
    value: string,
  ) => {
    const updated = [...installments];
    updated[index][field] = value;
    setInstallments(updated);
    saleForm.setValue("installments", updated);
  };

  const handleDeleteItem = (itemId: string, itemTitle: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${itemTitle}"? This action cannot be undone.`,
      )
    ) {
      deleteItemMutation.mutate(itemId);
    }
  };

  const handleSellItem = (item: ItemWithVendor) => {
    setSelectedItem(item);
    const maxPrice = item.maxSalesPrice?.toString() || "";
    saleForm.setValue("amount", maxPrice);
    saleForm.setValue("paymentType", "full");
    const initialInstallments = [{ amount: "", dueDate: "" }];
    setInstallments(initialInstallments);
    saleForm.setValue("installments", initialInstallments);
    setIsSaleModalOpen(true);
  };

  // Filter and sort items
  const filteredAndSortedItems = items
    ?.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.vendor.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "price-high":
          return Number(b.maxSalesPrice || 0) - Number(a.maxSalesPrice || 0);
        case "price-low":
          return Number(a.maxSalesPrice || 0) - Number(b.maxSalesPrice || 0);
        case "brand":
          return (a.brand || "").localeCompare(b.brand || "");
        default:
          return 0;
      }
    });

  // Calculate metrics
  const totalItems = items?.length || 0;
  const inStoreItems =
    items?.filter((item) => item.status === "in-store").length || 0;
  const reservedItems =
    items?.filter((item) => item.status === "reserved").length || 0;
  const soldItems = items?.filter((item) => item.status === "sold").length || 0;
  const totalValue =
    items?.reduce((sum, item) => sum + Number(item.maxSalesPrice || 0), 0) || 0;

  return (
    <MainLayout title="Inventory" subtitle="Manage your luxury items inventory">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Items
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {totalItems}
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
                  In Store
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {inStoreItems}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Reserved
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {reservedItems}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Inventario Luxette
                </p>
                <p className="text-sm font-bold text-foreground">
                  Costo Luxette | Valor Venta Luxette
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Value
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalValue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4 lg:flex-row lg:gap-4 lg:items-center lg:justify-between lg:space-y-0">
            <div className="flex flex-col space-y-4 sm:flex-row sm:gap-4 sm:space-y-0 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items, brands, vendors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-store">In Store</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>

              {/* Brand Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">MARCA</SelectItem>
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="in-store">Zapatos</SelectItem>
                  <SelectItem value="reserved">Relojes</SelectItem>
                  <SelectItem value="sold">ETC</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="brand">Brand A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Add Item Button */}
            <Dialog
              open={isCreateModalOpen}
              onOpenChange={setIsCreateModalOpen}
            >
              <DialogTrigger asChild>
                <Button
                  className="hidden md:flex"
                  data-testid="button-add-item"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Item</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="vendorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vendor</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select vendor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {vendorsLoading ? (
                                  <SelectItem value="loading" disabled>
                                    Loading vendors...
                                  </SelectItem>
                                ) : (
                                  vendors?.map((vendor) => (
                                    <SelectItem
                                      key={vendor.vendorId}
                                      value={vendor.vendorId}
                                    >
                                      {vendor.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Item title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brand</FormLabel>
                            <FormControl>
                              <Input placeholder="Brand name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Model number/name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="serialNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Serial Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Serial number"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="condition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Condition</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Excellent">
                                  Excellent
                                </SelectItem>
                                <SelectItem value="Very Good">
                                  Very Good
                                </SelectItem>
                                <SelectItem value="Good">Good</SelectItem>
                                <SelectItem value="Fair">Fair</SelectItem>
                                <SelectItem value="Poor">Poor</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="minCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Cost ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Cost ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="minSalesPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Sales Price ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxSalesPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Sales Price ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="acquisitionDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Acquisition Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="in-store">
                                  In Store
                                </SelectItem>
                                <SelectItem value="reserved">
                                  Reserved
                                </SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                                <SelectItem value="returned">
                                  Returned
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createItemMutation.isPending}
                      >
                        {createItemMutation.isPending
                          ? "Creating..."
                          : "Create Item"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Items ({filteredAndSortedItems?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {itemsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 p-4 border border-border rounded-lg"
                >
                  <Skeleton className="w-16 h-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedItems && filteredAndSortedItems.length > 0 ? (
            <div className="space-y-4">
              {filteredAndSortedItems.map((item) => {
                const IconComponent = getItemIcon(item.brand || "");
                return (
                  <div
                    key={item.itemId}
                    className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    {/* Mobile: Row layout for item info and actions */}
                    <div className="flex items-start space-x-4 w-full">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <IconComponent className="h-8 w-8 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                          <div className="flex items-center space-x-2 mb-1 sm:mb-0">
                            <h3 className="font-semibold text-foreground truncate">
                              {item.title}
                            </h3>
                            <StatusUpdateDropdown
                              itemId={item.itemId}
                              currentStatus={item.status}
                            />
                          </div>
                          <div className="text-right sm:text-left">
                            <p className="text-lg font-bold text-foreground">
                              {item.minSalesPrice && item.maxSalesPrice 
                                ? `${formatCurrency(item.minSalesPrice)} - ${formatCurrency(item.maxSalesPrice)}`
                                : formatCurrency(item.maxSalesPrice || item.minSalesPrice || 0)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Cost:{" "}
                              {item.minCost && item.maxCost 
                                ? `${formatCurrency(item.minCost)} - ${formatCurrency(item.maxCost)}`
                                : formatCurrency(item.maxCost || item.minCost || 0)}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-1">
                          {item.brand} • {item.model}
                          {item.serialNo && ` • S/N: ${item.serialNo}`}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1 flex-shrink-0" />
                            {item.vendor.name}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                            {formatDate(item.createdAt.toString())}
                          </span>
                          {item.condition && (
                            <span className="flex items-center">
                              <Tag className="h-3 w-3 mr-1 flex-shrink-0" />
                              {item.condition}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Desktop actions */}
                    <div className="hidden md:flex space-x-2">
                      {item.status === "in-store" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSellItem(item)}
                          disabled={createSaleMutation.isPending}
                          data-testid="button-sell-item"
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Sell
                        </Button>
                      )}
                      <Link href={`/item/${item.itemId}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/item/${item.itemId}`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleDeleteItem(item.itemId, item.title || "Item")
                        }
                        disabled={deleteItemMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Mobile actions dropdown */}
                    <div className="md:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            data-testid="button-item-actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/item/${item.itemId}`}
                              className="flex items-center w-full"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          {item.status === "in-store" && (
                            <DropdownMenuItem
                              onClick={() => handleSellItem(item)}
                              disabled={createSaleMutation.isPending}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Sell Item
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() =>
                              handleDeleteItem(
                                item.itemId,
                                item.title || "Item",
                              )
                            }
                            disabled={deleteItemMutation.isPending}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No items found
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "No items match your current filters"
                  : "Get started by adding your first item"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Item
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile Floating Action Button */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogTrigger asChild>
          <Button
            className="md:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
            size="sm"
            data-testid="fab-add-item"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
      </Dialog>

      {/* Sale Modal */}
      <Dialog open={isSaleModalOpen} onOpenChange={setIsSaleModalOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sell Item</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="mb-4 p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  {(() => {
                    const IconComponent = getItemIcon(selectedItem.brand || "");
                    return <IconComponent className="h-6 w-6 text-primary" />;
                  })()}
                </div>
                <div>
                  <h3 className="font-semibold">{selectedItem.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.brand} {selectedItem.model}
                  </p>
                  <p className="text-sm font-medium">
                    Price: {selectedItem.minSalesPrice && selectedItem.maxSalesPrice 
                      ? `${formatCurrency(selectedItem.minSalesPrice)} - ${formatCurrency(selectedItem.maxSalesPrice)}`
                      : formatCurrency(selectedItem.maxSalesPrice || selectedItem.minSalesPrice || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
          <Form {...saleForm}>
            <form
              onSubmit={saleForm.handleSubmit(onSaleSubmit, (errors) => {
                toast({
                  title: "Form Validation Error",
                  description: "Please check all required fields",
                  variant: "destructive",
                });
              })}
              className="space-y-4"
            >
              <FormField
                control={saleForm.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem
                            key={client.clientId}
                            value={client.clientId}
                          >
                            {client.name} - {client.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={saleForm.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="full">Full Payment</SelectItem>
                        <SelectItem value="installment">
                          Installment Plan
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={saleForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {saleForm.watch("paymentType") === "installment"
                        ? "Initial Payment Amount"
                        : "Payment Amount"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={saleForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="debit_card">Debit Card</SelectItem>
                        <SelectItem value="bank_transfer">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {saleForm.watch("paymentType") === "installment" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel>Installment Schedule</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addInstallment}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Installment
                    </Button>
                  </div>

                  {/* Remaining Amount Display */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Initial Payment:
                      </span>
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                        {formatCurrency(
                          parseFloat(saleForm.watch("amount")) || 0,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Installment Total:
                      </span>
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                        {formatCurrency(
                          installments.reduce(
                            (sum, inst) => sum + (parseFloat(inst.amount) || 0),
                            0,
                          ),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-blue-200 dark:border-blue-700">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Remaining Amount:
                      </span>
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                        {formatCurrency(
                          parseFloat(
                            selectedItem?.maxSalesPrice?.toString() || "0",
                          ) -
                            parseFloat(saleForm.watch("amount")) -
                            installments.reduce(
                              (sum, inst) =>
                                sum + (parseFloat(inst.amount) || 0),
                              0,
                            ),
                        )}
                      </span>
                    </div>
                  </div>
                  {installments.map((installment, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 p-3 border rounded-lg"
                    >
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={installment.amount}
                        onChange={(e) =>
                          updateInstallment(index, "amount", e.target.value)
                        }
                      />
                      <Input
                        type="date"
                        value={installment.dueDate}
                        onChange={(e) =>
                          updateInstallment(index, "dueDate", e.target.value)
                        }
                      />
                      {installments.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInstallment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSaleModalOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSaleMutation.isPending}
                  data-testid="button-record-sale"
                >
                  {createSaleMutation.isPending
                    ? "Processing..."
                    : "Record Sale"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
