import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBrandSchema, insertCategorySchema, insertPaymentMethodSchema, type Brand, type Category, type PaymentMethod, type InsertBrand, type InsertCategory, type InsertPaymentMethod } from "@shared/schema";
import { z } from "zod";
import { 
  Settings as SettingsIcon, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Tags,
  Package,
  Eye,
  EyeOff,
  MoreVertical,
  CreditCard
} from "lucide-react";

const brandFormSchema = insertBrandSchema.extend({
  name: z.string().min(1, "Brand name is required"),
});

const categoryFormSchema = insertCategorySchema.extend({
  name: z.string().min(1, "Category name is required"),
});

const paymentMethodFormSchema = insertPaymentMethodSchema.extend({
  name: z.string().min(1, "Payment method name is required"),
});

type BrandFormData = z.infer<typeof brandFormSchema>;
type CategoryFormData = z.infer<typeof categoryFormSchema>;
type PaymentMethodFormData = z.infer<typeof paymentMethodFormSchema>;

function formatDate(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Brand Management Component
function BrandManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: brands = [], isLoading } = useQuery<Brand[]>({
    queryKey: ['/api/brands'],
  });

  const createBrandMutation = useMutation({
    mutationFn: (data: BrandFormData) => 
      apiRequest('POST', '/api/brands', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      setIsCreateDialogOpen(false);
      toast({ title: "Brand created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error creating brand", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: ({ brandId, data }: { brandId: string; data: Partial<BrandFormData> }) =>
      apiRequest('PUT', `/api/brands/${brandId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      setEditingBrand(null);
      toast({ title: "Brand updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating brand", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: (brandId: string) =>
      apiRequest('DELETE', `/api/brands/${brandId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      toast({ title: "Brand deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error deleting brand", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const brandForm = useForm<BrandFormData>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: "",
      active: "true",
    },
  });

  const editForm = useForm<BrandFormData>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: "",
      active: "true",
    },
  });

  const filteredBrands = brands.filter((brand: Brand) =>
    brand.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateBrand = (data: BrandFormData) => {
    createBrandMutation.mutate(data);
  };

  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    editForm.reset({
      name: brand.name || "",
      active: brand.active || "true",
    });
  };

  const handleUpdateBrand = (data: BrandFormData) => {
    if (editingBrand) {
      updateBrandMutation.mutate({ brandId: editingBrand.brandId, data });
    }
  };

  const handleDeleteBrand = (brandId: string) => {
    if (confirm("Are you sure you want to delete this brand? This action cannot be undone.")) {
      deleteBrandMutation.mutate(brandId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Brand Management</h2>
          <p className="text-muted-foreground">Manage luxury brands in your inventory</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-brand">
              <Plus className="mr-2 h-4 w-4" />
              Add Brand
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Brand</DialogTitle>
            </DialogHeader>
            <Form {...brandForm}>
              <form onSubmit={brandForm.handleSubmit(handleCreateBrand)} className="space-y-4">
                <FormField
                  control={brandForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., Rolex, Cartier, Chanel" 
                          data-testid="input-brand-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={brandForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Allow items to be assigned to this brand
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === "true"}
                          onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                          data-testid="switch-brand-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-brand"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createBrandMutation.isPending}
                    data-testid="button-create-brand"
                  >
                    {createBrandMutation.isPending ? "Creating..." : "Create Brand"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search brands..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-brands"
        />
      </div>

      {/* Brands List */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-9 w-9" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBrands.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Tags className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchTerm ? "No brands found" : "No brands yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Try adjusting your search terms"
                  : "Get started by creating your first brand"
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-brand">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Brand
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredBrands.map((brand: Brand) => (
            <Card key={brand.brandId} data-testid={`card-brand-${brand.brandId}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-foreground" data-testid={`text-brand-name-${brand.brandId}`}>
                        {brand.name}
                      </h3>
                      <Badge 
                        variant={brand.active === "true" ? "default" : "secondary"}
                        data-testid={`badge-brand-status-${brand.brandId}`}
                      >
                        {brand.active === "true" ? (
                          <>
                            <Eye className="mr-1 h-3 w-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="mr-1 h-3 w-3" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created {formatDate(brand.createdAt || '')}
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid={`button-brand-actions-${brand.brandId}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditBrand(brand)} data-testid={`button-edit-brand-${brand.brandId}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteBrand(brand.brandId)}
                        className="text-destructive"
                        data-testid={`button-delete-brand-${brand.brandId}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingBrand} onOpenChange={() => setEditingBrand(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateBrand)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Rolex, Cartier, Chanel" 
                        data-testid="input-edit-brand-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Allow items to be assigned to this brand
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === "true"}
                        onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                        data-testid="switch-edit-brand-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingBrand(null)}
                  data-testid="button-cancel-edit-brand"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateBrandMutation.isPending}
                  data-testid="button-update-brand"
                >
                  {updateBrandMutation.isPending ? "Updating..." : "Update Brand"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Category Management Component  
function CategoryManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: CategoryFormData) => 
      apiRequest('POST', '/api/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsCreateDialogOpen(false);
      toast({ title: "Category created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error creating category", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: string; data: Partial<CategoryFormData> }) =>
      apiRequest('PUT', `/api/categories/${categoryId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setEditingCategory(null);
      toast({ title: "Category updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating category", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) =>
      apiRequest('DELETE', `/api/categories/${categoryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({ title: "Category deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error deleting category", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      active: "true",
    },
  });

  const editForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      active: "true",
    },
  });

  const filteredCategories = categories.filter((category: Category) =>
    category.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCategory = (data: CategoryFormData) => {
    createCategoryMutation.mutate(data);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    editForm.reset({
      name: category.name || "",
      active: category.active || "true",
    });
  };

  const handleUpdateCategory = (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ categoryId: editingCategory.categoryId, data });
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Category Management</h2>
          <p className="text-muted-foreground">Manage item categories in your inventory</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-category">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
            </DialogHeader>
            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(handleCreateCategory)} className="space-y-4">
                <FormField
                  control={categoryForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., Watches, Handbags, Jewelry" 
                          data-testid="input-category-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={categoryForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Allow items to be assigned to this category
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === "true"}
                          onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                          data-testid="switch-category-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-category"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createCategoryMutation.isPending}
                    data-testid="button-create-category"
                  >
                    {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-categories"
        />
      </div>

      {/* Categories List */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-9 w-9" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchTerm ? "No categories found" : "No categories yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Try adjusting your search terms"
                  : "Get started by creating your first category"
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-category">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Category
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredCategories.map((category: Category) => (
            <Card key={category.categoryId} data-testid={`card-category-${category.categoryId}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-foreground" data-testid={`text-category-name-${category.categoryId}`}>
                        {category.name}
                      </h3>
                      <Badge 
                        variant={category.active === "true" ? "default" : "secondary"}
                        data-testid={`badge-category-status-${category.categoryId}`}
                      >
                        {category.active === "true" ? (
                          <>
                            <Eye className="mr-1 h-3 w-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="mr-1 h-3 w-3" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created {formatDate(category.createdAt || '')}
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid={`button-category-actions-${category.categoryId}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditCategory(category)} data-testid={`button-edit-category-${category.categoryId}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteCategory(category.categoryId)}
                        className="text-destructive"
                        data-testid={`button-delete-category-${category.categoryId}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateCategory)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Watches, Handbags, Jewelry" 
                        data-testid="input-edit-category-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Allow items to be assigned to this category
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === "true"}
                        onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                        data-testid="switch-edit-category-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingCategory(null)}
                  data-testid="button-cancel-edit-category"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateCategoryMutation.isPending}
                  data-testid="button-update-category"
                >
                  {updateCategoryMutation.isPending ? "Updating..." : "Update Category"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Payment Method Management Component  
function PaymentMethodManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: paymentMethods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/payment-methods'],
  });

  const createPaymentMethodMutation = useMutation({
    mutationFn: (data: PaymentMethodFormData) => 
      apiRequest('POST', '/api/payment-methods', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      setIsCreateDialogOpen(false);
      toast({ title: "Payment method created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error creating payment method", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updatePaymentMethodMutation = useMutation({
    mutationFn: ({ paymentMethodId, data }: { paymentMethodId: string; data: Partial<PaymentMethodFormData> }) =>
      apiRequest('PUT', `/api/payment-methods/${paymentMethodId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      setEditingPaymentMethod(null);
      toast({ title: "Payment method updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating payment method", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: (paymentMethodId: string) =>
      apiRequest('DELETE', `/api/payment-methods/${paymentMethodId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      toast({ title: "Payment method deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error deleting payment method", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const paymentMethodForm = useForm<PaymentMethodFormData>({
    resolver: zodResolver(paymentMethodFormSchema),
    defaultValues: {
      name: "",
      active: "true",
    },
  });

  const editForm = useForm<PaymentMethodFormData>({
    resolver: zodResolver(paymentMethodFormSchema),
    defaultValues: {
      name: "",
      active: "true",
    },
  });

  const filteredPaymentMethods = paymentMethods.filter((paymentMethod: PaymentMethod) =>
    paymentMethod.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreatePaymentMethod = (data: PaymentMethodFormData) => {
    createPaymentMethodMutation.mutate(data);
  };

  const handleEditPaymentMethod = (paymentMethod: PaymentMethod) => {
    setEditingPaymentMethod(paymentMethod);
    editForm.reset({
      name: paymentMethod.name,
      active: paymentMethod.active,
    });
  };

  const handleUpdatePaymentMethod = (data: PaymentMethodFormData) => {
    if (!editingPaymentMethod) return;
    updatePaymentMethodMutation.mutate({
      paymentMethodId: editingPaymentMethod.paymentMethodId,
      data,
    });
  };

  const handleDeletePaymentMethod = (paymentMethodId: string, paymentMethodName: string) => {
    if (confirm(`Are you sure you want to delete the payment method "${paymentMethodName}"? This action cannot be undone.`)) {
      deletePaymentMethodMutation.mutate(paymentMethodId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payment methods..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-payment-methods"
          />
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-payment-method">
              <Plus className="mr-2 h-4 w-4" />
              Add Payment Method
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Payment Method</DialogTitle>
            </DialogHeader>
            <Form {...paymentMethodForm}>
              <form onSubmit={paymentMethodForm.handleSubmit(handleCreatePaymentMethod)} className="space-y-4">
                <FormField
                  control={paymentMethodForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., Cash, Credit Card, Wire Transfer" 
                          data-testid="input-create-payment-method-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={paymentMethodForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Allow this payment method to be used for new payments
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === "true"}
                          onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                          data-testid="switch-create-payment-method-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-create-payment-method"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createPaymentMethodMutation.isPending}
                    data-testid="button-submit-create-payment-method"
                  >
                    {createPaymentMethodMutation.isPending ? "Creating..." : "Create Payment Method"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-9 w-9" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPaymentMethods.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchTerm ? "No payment methods found" : "No payment methods yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Try adjusting your search terms"
                  : "Get started by creating your first payment method"
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-payment-method">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Payment Method
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPaymentMethods.map((paymentMethod: PaymentMethod) => (
            <Card key={paymentMethod.paymentMethodId} data-testid={`card-payment-method-${paymentMethod.paymentMethodId}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-foreground" data-testid={`text-payment-method-name-${paymentMethod.paymentMethodId}`}>
                        {paymentMethod.name}
                      </h3>
                      <Badge 
                        variant={paymentMethod.active === "true" ? "default" : "secondary"}
                        data-testid={`badge-payment-method-status-${paymentMethod.paymentMethodId}`}
                      >
                        {paymentMethod.active === "true" ? (
                          <>
                            <Eye className="mr-1 h-3 w-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="mr-1 h-3 w-3" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created {formatDate(paymentMethod.createdAt)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid={`button-payment-method-actions-${paymentMethod.paymentMethodId}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleEditPaymentMethod(paymentMethod)}
                        data-testid={`button-edit-payment-method-${paymentMethod.paymentMethodId}`}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeletePaymentMethod(paymentMethod.paymentMethodId, paymentMethod.name)}
                        className="text-destructive focus:text-destructive"
                        data-testid={`button-delete-payment-method-${paymentMethod.paymentMethodId}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPaymentMethod} onOpenChange={() => setEditingPaymentMethod(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment Method</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdatePaymentMethod)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Cash, Credit Card, Wire Transfer" 
                        data-testid="input-edit-payment-method-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Allow this payment method to be used for new payments
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === "true"}
                        onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                        data-testid="switch-edit-payment-method-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingPaymentMethod(null)}
                  data-testid="button-cancel-edit-payment-method"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updatePaymentMethodMutation.isPending}
                  data-testid="button-update-payment-method"
                >
                  {updatePaymentMethodMutation.isPending ? "Updating..." : "Update Payment Method"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Main Settings Page Component
export default function Settings() {
  return (
    <MainLayout title="Settings">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-primary to-purple-600 rounded-lg flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage system configuration and data</p>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="brands" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="brands" data-testid="tab-brands">
              <Tags className="mr-2 h-4 w-4" />
              Brands
            </TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">
              <Package className="mr-2 h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="payment-methods" data-testid="tab-payment-methods">
              <CreditCard className="mr-2 h-4 w-4" />
              Payment Methods
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brands">
            <BrandManagement />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManagement />
          </TabsContent>

          <TabsContent value="payment-methods">
            <PaymentMethodManagement />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}