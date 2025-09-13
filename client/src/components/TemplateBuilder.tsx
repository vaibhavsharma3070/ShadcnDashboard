import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  ChevronDown, 
  Copy, 
  Save, 
  Eye, 
  Code, 
  FileText,
  User,
  Package,
  Calendar,
  Settings,
  Info,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Variable {
  key: string;
  description: string;
  category: string;
  example?: string;
}

const TEMPLATE_VARIABLES: Variable[] = [
  // Vendor Variables
  { key: "{{VENDOR_NAME}}", description: "Nombre del consignador", category: "vendor", example: "Juan Pérez" },
  { key: "{{VENDOR_EMAIL}}", description: "Correo electrónico del consignador", category: "vendor", example: "juan@email.com" },
  { key: "{{VENDOR_PHONE}}", description: "Teléfono del consignador", category: "vendor", example: "+52 555-1234" },
  { key: "{{VENDOR_TAX_ID}}", description: "RFC/ID fiscal del consignador", category: "vendor", example: "PERJ800101XXX" },
  { key: "{{VENDOR_BANK_NAME}}", description: "Nombre del banco", category: "vendor", example: "Banco Nacional" },
  { key: "{{VENDOR_ACCOUNT_NUMBER}}", description: "Número de cuenta bancaria", category: "vendor", example: "1234567890" },
  { key: "{{VENDOR_ACCOUNT_TYPE}}", description: "Tipo de cuenta", category: "vendor", example: "Ahorros" },
  
  // Items Variables
  { key: "{{ITEMS_TABLE}}", description: "Tabla con todos los artículos consignados", category: "items" },
  { key: "{{ITEMS_COUNT}}", description: "Cantidad total de artículos", category: "items", example: "5" },
  
  // Contract Terms
  { key: "{{COMMISSION_PERCENTAGE}}", description: "Porcentaje de comisión", category: "terms", example: "30%" },
  { key: "{{PAYMENT_TERMS}}", description: "Términos de pago (días)", category: "terms", example: "30 días" },
  { key: "{{CONSIGNMENT_PERIOD}}", description: "Período de consignación (meses)", category: "terms", example: "6 meses" },
  { key: "{{WITHDRAWAL_NOTICE}}", description: "Aviso de retiro (días)", category: "terms", example: "30 días" },
  
  // System Variables
  { key: "{{CONTRACT_DATE}}", description: "Fecha del contrato", category: "system", example: "1 de enero de 2024" },
  { key: "{{CONTRACT_ID}}", description: "ID único del contrato", category: "system", example: "CTR-2024-001" },
];

const SAMPLE_DATA = {
  vendor: {
    name: "María González",
    email: "maria.gonzalez@email.com",
    phone: "+52 555-9876",
    taxId: "GOMA900215XXX",
    bankName: "BBVA México",
    accountNumber: "0123456789",
    accountType: "Ahorros"
  },
  items: [
    { name: "Bolso Louis Vuitton", brand: "Louis Vuitton", model: "Neverfull MM", price: "$1,500" },
    { name: "Reloj Rolex", brand: "Rolex", model: "Submariner", price: "$8,000" },
    { name: "Collar Tiffany", brand: "Tiffany & Co.", model: "Return to Tiffany", price: "$450" }
  ],
  terms: {
    commission: "30",
    paymentTerms: "30",
    consignmentPeriod: "6",
    withdrawalNotice: "30"
  },
  system: {
    contractDate: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
    contractId: `CTR-${Date.now().toString().slice(-8)}`
  }
};

interface TemplateBuilderProps {
  template?: {
    templateId?: string;
    name: string;
    termsText: string;
    isDefault?: boolean;
  };
  onSave: (template: { name: string; termsText: string; isDefault?: boolean }) => void;
  onCancel?: () => void;
}

export default function TemplateBuilder({ template, onSave, onCancel }: TemplateBuilderProps) {
  const [name, setName] = useState(template?.name || "");
  const [content, setContent] = useState(template?.termsText || "");
  const [isDefault, setIsDefault] = useState(template?.isDefault || false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Insert variable at cursor position
  const insertVariable = (variable: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + variable + content.substring(end);
    
    setContent(newContent);
    
    // Set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  // Copy variable to clipboard
  const copyVariable = async (variable: string) => {
    try {
      await navigator.clipboard.writeText(variable);
      setCopiedVariable(variable);
      setTimeout(() => setCopiedVariable(null), 2000);
      toast({
        title: "Copiado",
        description: `Variable ${variable} copiada al portapapeles`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar la variable",
        variant: "destructive",
      });
    }
  };

  // Replace variables with sample data for preview
  const getPreviewContent = () => {
    let preview = content;
    
    // Replace vendor variables
    preview = preview.replace(/\{\{VENDOR_NAME\}\}/g, SAMPLE_DATA.vendor.name);
    preview = preview.replace(/\{\{VENDOR_EMAIL\}\}/g, SAMPLE_DATA.vendor.email);
    preview = preview.replace(/\{\{VENDOR_PHONE\}\}/g, SAMPLE_DATA.vendor.phone);
    preview = preview.replace(/\{\{VENDOR_TAX_ID\}\}/g, SAMPLE_DATA.vendor.taxId);
    preview = preview.replace(/\{\{VENDOR_BANK_NAME\}\}/g, SAMPLE_DATA.vendor.bankName);
    preview = preview.replace(/\{\{VENDOR_ACCOUNT_NUMBER\}\}/g, SAMPLE_DATA.vendor.accountNumber);
    preview = preview.replace(/\{\{VENDOR_ACCOUNT_TYPE\}\}/g, SAMPLE_DATA.vendor.accountType);
    
    // Replace items variables
    const itemsTable = SAMPLE_DATA.items.map((item, index) => 
      `${index + 1}. ${item.name} - ${item.brand} - ${item.model} - ${item.price}`
    ).join('\n');
    preview = preview.replace(/\{\{ITEMS_TABLE\}\}/g, itemsTable);
    preview = preview.replace(/\{\{ITEMS_COUNT\}\}/g, SAMPLE_DATA.items.length.toString());
    
    // Replace terms variables
    preview = preview.replace(/\{\{COMMISSION_PERCENTAGE\}\}/g, SAMPLE_DATA.terms.commission);
    preview = preview.replace(/\{\{PAYMENT_TERMS\}\}/g, SAMPLE_DATA.terms.paymentTerms);
    preview = preview.replace(/\{\{CONSIGNMENT_PERIOD\}\}/g, SAMPLE_DATA.terms.consignmentPeriod);
    preview = preview.replace(/\{\{WITHDRAWAL_NOTICE\}\}/g, SAMPLE_DATA.terms.withdrawalNotice);
    
    // Replace system variables
    preview = preview.replace(/\{\{CONTRACT_DATE\}\}/g, SAMPLE_DATA.system.contractDate);
    preview = preview.replace(/\{\{CONTRACT_ID\}\}/g, SAMPLE_DATA.system.contractId);
    
    return preview;
  };

  // Highlight variables in preview
  const getHighlightedPreview = () => {
    const preview = getPreviewContent();
    return preview.split('\n').map((line, index) => (
      <p key={index} className="mb-2">
        {line || '\u00A0'}
      </p>
    ));
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para la plantilla",
        variant: "destructive",
      });
      return;
    }
    
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa el contenido de la plantilla",
        variant: "destructive",
      });
      return;
    }
    
    onSave({ name, termsText: content, isDefault });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "vendor": return <User className="h-4 w-4" />;
      case "items": return <Package className="h-4 w-4" />;
      case "terms": return <FileText className="h-4 w-4" />;
      case "system": return <Settings className="h-4 w-4" />;
      default: return <Code className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "vendor": return "bg-blue-500";
      case "items": return "bg-green-500";
      case "terms": return "bg-purple-500";
      case "system": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Editor */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {template?.templateId ? "Editar Plantilla" : "Nueva Plantilla"}
            </CardTitle>
            <CardDescription>
              Crea o edita una plantilla de contrato con variables dinámicas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nombre de la Plantilla</Label>
              <Input
                id="template-name"
                placeholder="Ej: Contrato Estándar de Consignación"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="default-template"
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
              <Label htmlFor="default-template">
                Establecer como plantilla predeterminada
              </Label>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit">
                  <Code className="h-4 w-4 mr-2" />
                  Editar
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="h-4 w-4 mr-2" />
                  Vista Previa
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="space-y-2">
                <Label>Contenido de la Plantilla</Label>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Usa las variables de la derecha para crear contenido dinámico. 
                    Haz clic en una variable para insertarla en la posición del cursor.
                  </AlertDescription>
                </Alert>
                <Textarea
                  ref={textareaRef}
                  placeholder="Escribe el contenido del contrato aquí..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                />
              </TabsContent>

              <TabsContent value="preview" className="space-y-2">
                <Label>Vista Previa con Datos de Ejemplo</Label>
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  <div className="prose prose-sm max-w-none">
                    {getHighlightedPreview()}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
              )}
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {template?.templateId ? "Actualizar" : "Guardar"} Plantilla
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variables Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Variables Disponibles</CardTitle>
            <CardDescription>
              Haz clic para insertar o copiar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {/* Vendor Variables */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-lg">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">Variables del Consignador</span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {TEMPLATE_VARIABLES.filter(v => v.category === "vendor").map((variable) => (
                      <div
                        key={variable.key}
                        className="p-2 rounded-lg border hover:bg-accent cursor-pointer group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1" onClick={() => insertVariable(variable.key)}>
                            <Badge className={`${getCategoryColor(variable.category)} text-white mb-1`}>
                              {variable.key}
                            </Badge>
                            <p className="text-sm text-muted-foreground">{variable.description}</p>
                            {variable.example && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Ejemplo: {variable.example}
                              </p>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => copyVariable(variable.key)}
                          >
                            {copiedVariable === variable.key ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                <Separator />

                {/* Items Variables */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span className="font-medium">Variables de Artículos</span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {TEMPLATE_VARIABLES.filter(v => v.category === "items").map((variable) => (
                      <div
                        key={variable.key}
                        className="p-2 rounded-lg border hover:bg-accent cursor-pointer group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1" onClick={() => insertVariable(variable.key)}>
                            <Badge className={`${getCategoryColor(variable.category)} text-white mb-1`}>
                              {variable.key}
                            </Badge>
                            <p className="text-sm text-muted-foreground">{variable.description}</p>
                            {variable.example && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Ejemplo: {variable.example}
                              </p>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => copyVariable(variable.key)}
                          >
                            {copiedVariable === variable.key ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                <Separator />

                {/* Contract Terms */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Términos del Contrato</span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {TEMPLATE_VARIABLES.filter(v => v.category === "terms").map((variable) => (
                      <div
                        key={variable.key}
                        className="p-2 rounded-lg border hover:bg-accent cursor-pointer group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1" onClick={() => insertVariable(variable.key)}>
                            <Badge className={`${getCategoryColor(variable.category)} text-white mb-1`}>
                              {variable.key}
                            </Badge>
                            <p className="text-sm text-muted-foreground">{variable.description}</p>
                            {variable.example && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Ejemplo: {variable.example}
                              </p>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => copyVariable(variable.key)}
                          >
                            {copiedVariable === variable.key ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                <Separator />

                {/* System Variables */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span className="font-medium">Variables del Sistema</span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {TEMPLATE_VARIABLES.filter(v => v.category === "system").map((variable) => (
                      <div
                        key={variable.key}
                        className="p-2 rounded-lg border hover:bg-accent cursor-pointer group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1" onClick={() => insertVariable(variable.key)}>
                            <Badge className={`${getCategoryColor(variable.category)} text-white mb-1`}>
                              {variable.key}
                            </Badge>
                            <p className="text-sm text-muted-foreground">{variable.description}</p>
                            {variable.example && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Ejemplo: {variable.example}
                              </p>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => copyVariable(variable.key)}
                          >
                            {copiedVariable === variable.key ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}