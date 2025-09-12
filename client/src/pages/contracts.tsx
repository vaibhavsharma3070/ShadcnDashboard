import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/layout/sidebar";
import { Link } from "wouter";
import { 
  FileText, 
  Plus, 
  Calendar, 
  User, 
  Download,
  Edit,
  Trash2
} from "lucide-react";
import type { Contract, ContractTemplate, ContractItemSnapshot } from "@shared/schema";

// Extended contract type with vendor and template info
type ContractWithDetails = Contract & { 
  vendor: { vendorId: string; name: string; email: string; };
  template?: ContractTemplate;
};

export default function Contracts() {
  const [activeTab, setActiveTab] = useState<"contracts" | "templates">("contracts");

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
                  <Button data-testid="button-create-contract">
                    <FileText className="h-4 w-4 mr-2" />
                    Nuevo Contrato
                  </Button>
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
                            
                            {contract.itemSnapshots && Array.isArray(contract.itemSnapshots) && contract.itemSnapshots.length > 0 && (
                              <div className="text-sm text-muted-foreground">
                                {(contract.itemSnapshots as ContractItemSnapshot[]).length} producto(s) incluido(s)
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center pt-2">
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm" data-testid={`button-edit-${contract.contractId}`}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {contract.status === "final" && contract.pdfUrl && (
                                  <Button variant="outline" size="sm" data-testid={`button-download-${contract.contractId}`}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
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