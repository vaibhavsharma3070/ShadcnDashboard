import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sidebar } from "@/components/layout/sidebar";
import { Link } from "wouter";
import { 
  FileText, 
  Plus, 
  Calendar, 
  User, 
  Download,
  Edit,
  Trash2,
  Users,
  Package,
  ChevronRight
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { pdf } from "@react-pdf/renderer";
import ContractPDF from "@/components/ContractPDF";
import type { Contract, ContractTemplate, ContractItemSnapshot, Vendor, Item } from "@shared/schema";

// Extended contract type with vendor and template info
type ContractWithDetails = Contract & { 
  vendor: { vendorId: string; name: string; email: string; };
  template?: ContractTemplate;
};

// Contract creation form schema
const contractCreationSchema = z.object({
  vendorId: z.string().min(1, "Selecciona un proveedor"),
  templateId: z.string().min(1, "Selecciona una plantilla"),
  selectedItems: z.array(z.string()).min(1, "Selecciona al menos un artículo"),
  commissionPercentage: z.coerce.number().min(0).max(100).default(30),
  paymentTerms: z.string().default("30"),
  consignmentPeriod: z.string().default("6"),
  withdrawalNotice: z.string().default("30")
});

type ContractCreationFormData = z.infer<typeof contractCreationSchema>;

// Contract Creation Wizard Component
function ContractCreationWizard() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const { toast } = useToast();

  const form = useForm<ContractCreationFormData>({
    resolver: zodResolver(contractCreationSchema),
    defaultValues: {
      vendorId: "",
      templateId: "",
      selectedItems: [],
      commissionPercentage: 30,
      paymentTerms: "30",
      consignmentPeriod: "6",
      withdrawalNotice: "30"
    }
  });

  // Fetch vendors
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  // Fetch contract templates
  const { data: templates = [] } = useQuery<ContractTemplate[]>({
    queryKey: ["/api/contract-templates"],
  });

  // Fetch default template
  const { data: defaultTemplate } = useQuery<ContractTemplate>({
    queryKey: ["/api/contract-templates/default"],
  });

  // Fetch vendor items when vendor is selected
  const { data: vendorItems = [] } = useQuery<Item[]>({
    queryKey: ["/api/items", selectedVendorId],
    queryFn: async () => {
      if (!selectedVendorId) return [];
      const response = await fetch(`/api/items?vendorId=${selectedVendorId}`);
      if (!response.ok) throw new Error('Failed to fetch vendor items');
      return response.json();
    },
    enabled: !!selectedVendorId
  });

  // Contract creation mutation
  const createContractMutation = useMutation({
    mutationFn: async (data: ContractCreationFormData) => {
      // First, get the selected vendor and items
      const vendor = vendors.find(v => v.vendorId === data.vendorId);
      const items = vendorItems.filter(item => data.selectedItems.includes(item.itemId));
      const template = templates.find(t => t.templateId === data.templateId) || defaultTemplate;
      
      if (!vendor || !template) {
        throw new Error('Vendor or template not found');
      }

      // Create item snapshots
      const itemSnapshots = items.map(item => ({
        itemId: item.itemId,
        title: item.title || '',
        description: item.model || '',
        currentPrice: Number(item.minSalesPrice || 0),
        originalPrice: Number(item.minCost || 0),
        category: item.categoryId || '',
        brand: item.brand || '',
        condition: item.condition || '',
        images: item.imageUrl ? [item.imageUrl] : []
      }));

      // Generate terms text by replacing template variables (using global replacement)
      let termsText = template.termsText;
      termsText = termsText.replaceAll('{{VENDOR_NAME}}', vendor.name || '');
      termsText = termsText.replaceAll('{{VENDOR_PHONE}}', vendor.phone || '');
      termsText = termsText.replaceAll('{{VENDOR_EMAIL}}', vendor.email || '');
      termsText = termsText.replaceAll('{{VENDOR_TAX_ID}}', vendor.taxId || '');
      termsText = termsText.replaceAll('{{VENDOR_BANK_NAME}}', vendor.bankName || '');
      termsText = termsText.replaceAll('{{VENDOR_ACCOUNT_NUMBER}}', vendor.bankAccountNumber || '');
      termsText = termsText.replaceAll('{{VENDOR_ACCOUNT_TYPE}}', vendor.accountType || '');
      termsText = termsText.replaceAll('{{COMMISSION_PERCENTAGE}}', data.commissionPercentage.toString());
      termsText = termsText.replaceAll('{{PAYMENT_TERMS}}', data.paymentTerms);
      termsText = termsText.replaceAll('{{CONSIGNMENT_PERIOD}}', data.consignmentPeriod);
      termsText = termsText.replaceAll('{{WITHDRAWAL_NOTICE}}', data.withdrawalNotice);
      termsText = termsText.replaceAll('{{CONTRACT_DATE}}', new Date().toLocaleDateString('es-ES'));
      
      // Create items table
      const itemsTable = items.map((item, index) => 
        `${index + 1}. ${item.title || 'Sin título'} - ${item.brand || 'N/A'} - ${item.model || 'N/A'} - $${Number(item.minSalesPrice || 0).toFixed(2)}`
      ).join('\n');
      termsText = termsText.replaceAll('{{ITEMS_TABLE}}', itemsTable);

      const contractData = {
        vendorId: data.vendorId,
        templateId: data.templateId,
        status: 'draft' as const,
        termsText,
        itemSnapshots
      };

      const response = await apiRequest('POST', '/api/contracts', contractData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "¡Éxito!",
        description: "Contrato creado exitosamente"
      });
      setIsOpen(false);
      form.reset();
      setSelectedVendorId("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al crear el contrato: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ContractCreationFormData) => {
    createContractMutation.mutate(data);
  };

  // Set default template when available using useEffect to avoid render issues
  useEffect(() => {
    if (defaultTemplate && !form.getValues().templateId) {
      form.setValue('templateId', defaultTemplate.templateId);
    }
  }, [defaultTemplate, form]);

  const availableItems = vendorItems.filter(item => 
    item.status === 'in-store' || item.status === 'available'
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-contract">
          <Plus className="h-4 w-4 mr-2" />
          Crear Contrato
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Contrato</DialogTitle>
          <DialogDescription>
            Selecciona un proveedor, sus artículos, y los términos del contrato
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Vendor Selection */}
            <FormField
              control={form.control}
              name="vendorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Proveedor
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedVendorId(value);
                      form.setValue('selectedItems', []); // Reset items when vendor changes
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-vendor">
                        <SelectValue placeholder="Selecciona un proveedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.vendorId} value={vendor.vendorId}>
                          {vendor.name} - {vendor.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Items Selection */}
            {selectedVendorId && (
              <FormField
                control={form.control}
                name="selectedItems"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Artículos Disponibles ({availableItems.length})
                    </FormLabel>
                    <div className="grid gap-3 max-h-60 overflow-y-auto border rounded-md p-3">
                      {availableItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No hay artículos disponibles para este proveedor
                        </p>
                      ) : (
                        availableItems.map((item) => (
                          <div key={item.itemId} className="flex items-center space-x-2">
                            <Checkbox
                              id={item.itemId}
                              checked={field.value.includes(item.itemId)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, item.itemId]);
                                } else {
                                  field.onChange(field.value.filter(id => id !== item.itemId));
                                }
                              }}
                              data-testid={`checkbox-item-${item.itemId}`}
                            />
                            <Label htmlFor={item.itemId} className="flex-1 cursor-pointer">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="font-medium">{item.title || 'Sin título'}</span>
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {item.brand || 'N/A'} - {item.model || 'N/A'}
                                  </span>
                                </div>
                                <span className="font-medium">${Number(item.minSalesPrice || 0).toFixed(2)}</span>
                              </div>
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Template Selection */}
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Plantilla de Contrato
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-template">
                        <SelectValue placeholder="Selecciona una plantilla" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.templateId} value={template.templateId}>
                          {template.name} {template.isDefault && '(Por defecto)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                data-testid="button-cancel-contract"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createContractMutation.isPending}
                data-testid="button-submit-contract"
              >
                {createContractMutation.isPending ? 'Creando...' : 'Crear Contrato'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Contracts() {
  const [activeTab, setActiveTab] = useState<"contracts" | "templates">("contracts");
  const [downloadingContract, setDownloadingContract] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch contracts
  const { data: contracts = [], isLoading: contractsLoading } = useQuery<ContractWithDetails[]>({
    queryKey: ["/api/contracts"],
  });

  // Fetch contract templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery<ContractTemplate[]>({
    queryKey: ["/api/contract-templates"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "final":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "Borrador";
      case "final":
        return "Finalizado";
      default:
        return status;
    }
  };

  const handleDownloadPDF = async (contract: ContractWithDetails) => {
    try {
      setDownloadingContract(contract.contractId);
      
      // Fetch complete contract data with vendor details
      const response = await fetch(`/api/contracts/${contract.contractId}/pdf`);
      if (!response.ok) throw new Error('Failed to fetch contract data');
      const contractData = await response.json();
      
      // Generate PDF
      const blob = await pdf(<ContractPDF contract={contractData} />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Contrato_${contract.vendor.name.replace(/\s+/g, '_')}_${contract.contractId.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "¡Éxito!",
        description: "PDF del contrato descargado exitosamente"
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: "Error al generar el PDF del contrato",
        variant: "destructive"
      });
    } finally {
      setDownloadingContract(null);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Gestión de Contratos
                  </h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Administra contratos con consignadores y plantillas de documentos
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Button data-testid="button-create-template">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Plantilla
                  </Button>
                  <ContractCreationWizard />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "contracts" | "templates")}>
              <TabsList className="grid w-full grid-cols-2 lg:w-96">
                <TabsTrigger value="contracts" data-testid="tab-contracts">
                  Contratos ({contracts.length})
                </TabsTrigger>
                <TabsTrigger value="templates" data-testid="tab-templates">
                  Plantillas ({templates.length})
                </TabsTrigger>
              </TabsList>

              {/* Contracts Tab */}
              <TabsContent value="contracts" className="space-y-4">
                {contractsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Cargando contratos...</p>
                  </div>
                ) : contracts.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No hay contratos creados
                      </h3>
                      <p className="text-muted-foreground text-center mb-4">
                        Comienza creando tu primer contrato con un consignador
                      </p>
                      <Button data-testid="button-create-first-contract">
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Primer Contrato
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {contracts.map((contract) => (
                      <Card key={contract.contractId} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg mb-1" data-testid={`text-contract-title-${contract.contractId}`}>
                                Contrato - {contract.vendor.name}
                              </CardTitle>
                              <CardDescription className="flex items-center">
                                <User className="h-4 w-4 mr-1" />
                                {contract.vendor.name}
                              </CardDescription>
                            </div>
                            <Badge className={getStatusColor(contract.status)} data-testid={`badge-status-${contract.contractId}`}>
                              {getStatusLabel(contract.status)}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4 mr-2" />
                              Creado: {new Date(contract.createdAt).toLocaleDateString("es-ES")}
                            </div>
                            
                            {contract.itemSnapshots && Array.isArray(contract.itemSnapshots) && contract.itemSnapshots.length > 0 ? (
                              <div className="text-sm text-muted-foreground">
                                {contract.itemSnapshots.length} producto(s) incluido(s)
                              </div>
                            ) : null}
                            
                            <div className="flex justify-between items-center pt-2">
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm" data-testid={`button-edit-${contract.contractId}`}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleDownloadPDF(contract)}
                                  disabled={downloadingContract === contract.contractId}
                                  data-testid={`button-download-${contract.contractId}`}
                                >
                                  <Download className="h-4 w-4" />
                                  {downloadingContract === contract.contractId && (
                                    <span className="ml-1">...</span>
                                  )}
                                </Button>
                                <Button variant="outline" size="sm" data-testid={`button-delete-${contract.contractId}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Templates Tab */}
              <TabsContent value="templates" className="space-y-4">
                {templatesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Cargando plantillas...</p>
                  </div>
                ) : templates.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No hay plantillas creadas
                      </h3>
                      <p className="text-muted-foreground text-center mb-4">
                        Crea plantillas reutilizables para agilizar la creación de contratos
                      </p>
                      <Button data-testid="button-create-first-template">
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Primera Plantilla
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => (
                      <Card key={template.templateId} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg mb-1" data-testid={`text-template-title-${template.templateId}`}>
                                {template.name}
                              </CardTitle>
                              <CardDescription className="text-sm text-muted-foreground">
                                Plantilla de contrato
                              </CardDescription>
                            </div>
                            {template.isDefault && (
                              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                Por Defecto
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4 mr-2" />
                              Creado: {new Date(template.createdAt).toLocaleDateString("es-ES")}
                            </div>
                            
                            <div className="flex justify-between items-center pt-2">
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm" data-testid={`button-edit-template-${template.templateId}`}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" data-testid={`button-delete-template-${template.templateId}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}