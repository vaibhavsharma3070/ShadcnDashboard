import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { ObjectStorageService } from "./objectStorage";
import { 
  insertVendorSchema, insertClientSchema, insertItemSchema, 
  insertClientPaymentSchema, insertVendorPayoutSchema, insertItemExpenseSchema, insertInstallmentPlanSchema,
  insertBrandSchema, insertCategorySchema, insertPaymentMethodSchema
} from "@shared/schema";

// Helper function to categorize errors
function handleStorageError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // 404 - Not found errors
    if (message.includes('not found')) {
      return { status: 404, message: error.message };
    }
    
    // 409 - Constraint violation errors
    if (message.includes('cannot delete') || message.includes('referenced by')) {
      return { status: 409, message: error.message };
    }
    
    // 500 - Other errors
    return { status: 500, message: error.message };
  }
  
  // 500 - Unknown errors
  return { status: 500, message: "An unexpected error occurred" };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard routes
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  app.get("/api/dashboard/recent-items", async (req, res) => {
    try {
      const items = await storage.getRecentItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent items" });
    }
  });

  app.get("/api/dashboard/top-performing", async (req, res) => {
    try {
      const items = await storage.getTopPerformingItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch top performing items" });
    }
  });

  app.get("/api/dashboard/luxette-inventory", async (req, res) => {
    try {
      const luxetteData = await storage.getLuxetteInventoryData();
      res.json(luxetteData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Luxette inventory data" });
    }
  });

  app.get("/api/dashboard/financial-data", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }
      
      const financialData = await storage.getFinancialDataByDateRange(
        startDate as string,
        endDate as string
      );
      res.json(financialData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch financial data" });
    }
  });

  // Vendor routes
  app.get("/api/vendors", async (req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/:id", async (req, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor" });
    }
  });

  app.post("/api/vendors", async (req, res) => {
    try {
      const validatedData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(validatedData);
      res.status(201).json(vendor);
    } catch (error) {
      res.status(400).json({ error: "Invalid vendor data" });
    }
  });

  app.put("/api/vendors/:id", async (req, res) => {
    try {
      const validatedData = insertVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateVendor(req.params.id, validatedData);
      res.json(vendor);
    } catch (error) {
      // Check if it's a Zod validation error
      if (error && typeof error === 'object' && 'issues' in error) {
        res.status(400).json({ error: "Invalid vendor data" });
      } else {
        // It's a storage error
        const { status, message } = handleStorageError(error);
        res.status(status).json({ error: message });
      }
    }
  });

  app.delete("/api/vendors/:id", async (req, res) => {
    try {
      await storage.deleteVendor(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });

  // Brand routes
  app.get("/api/brands", async (req, res) => {
    try {
      const brands = await storage.getBrands();
      res.json(brands);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brands" });
    }
  });

  app.get("/api/brands/:id", async (req, res) => {
    try {
      const brand = await storage.getBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      res.json(brand);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brand" });
    }
  });

  app.post("/api/brands", async (req, res) => {
    try {
      const validatedData = insertBrandSchema.parse(req.body);
      const brand = await storage.createBrand(validatedData);
      res.status(201).json(brand);
    } catch (error) {
      res.status(400).json({ error: "Invalid brand data" });
    }
  });

  app.put("/api/brands/:id", async (req, res) => {
    try {
      const validatedData = insertBrandSchema.partial().parse(req.body);
      const brand = await storage.updateBrand(req.params.id, validatedData);
      res.json(brand);
    } catch (error) {
      // Check if it's a Zod validation error
      if (error && typeof error === 'object' && 'issues' in error) {
        res.status(400).json({ error: "Invalid brand data" });
      } else {
        // It's a storage error
        const { status, message } = handleStorageError(error);
        res.status(status).json({ error: message });
      }
    }
  });

  app.delete("/api/brands/:id", async (req, res) => {
    try {
      await storage.deleteBrand(req.params.id);
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleStorageError(error);
      res.status(status).json({ error: message });
    }
  });

  // Category routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const validatedData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(req.params.id, validatedData);
      res.json(category);
    } catch (error) {
      // Check if it's a Zod validation error
      if (error && typeof error === 'object' && 'issues' in error) {
        res.status(400).json({ error: "Invalid category data" });
      } else {
        // It's a storage error
        const { status, message } = handleStorageError(error);
        res.status(status).json({ error: message });
      }
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleStorageError(error);
      res.status(status).json({ error: message });
    }
  });

  // Payment Method routes
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const paymentMethods = await storage.getPaymentMethods();
      res.json(paymentMethods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  app.get("/api/payment-methods/:id", async (req, res) => {
    try {
      const paymentMethod = await storage.getPaymentMethod(req.params.id);
      if (!paymentMethod) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      res.json(paymentMethod);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment method" });
    }
  });

  app.post("/api/payment-methods", async (req, res) => {
    try {
      const validatedData = insertPaymentMethodSchema.parse(req.body);
      const paymentMethod = await storage.createPaymentMethod(validatedData);
      res.status(201).json(paymentMethod);
    } catch (error) {
      res.status(400).json({ error: "Invalid payment method data" });
    }
  });

  app.put("/api/payment-methods/:id", async (req, res) => {
    try {
      const validatedData = insertPaymentMethodSchema.partial().parse(req.body);
      const paymentMethod = await storage.updatePaymentMethod(req.params.id, validatedData);
      res.json(paymentMethod);
    } catch (error) {
      // Check if it's a Zod validation error
      if (error && typeof error === 'object' && 'issues' in error) {
        res.status(400).json({ error: "Invalid payment method data" });
      } else {
        // It's a storage error
        const { status, message } = handleStorageError(error);
        res.status(status).json({ error: message });
      }
    }
  });

  app.delete("/api/payment-methods/:id", async (req, res) => {
    try {
      await storage.deletePaymentMethod(req.params.id);
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleStorageError(error);
      res.status(status).json({ error: message });
    }
  });

  // Data migration route
  app.post("/api/migration/brands", async (req, res) => {
    try {
      const migrationResult = await storage.migrateLegacyBrands();
      res.json({
        success: true,
        message: "Brand migration completed successfully",
        result: migrationResult
      });
    } catch (error) {
      res.status(500).json({ 
        error: "Migration failed", 
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Client routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data" });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, validatedData);
      res.json(client);
    } catch (error) {
      // Check if it's a Zod validation error
      if (error && typeof error === 'object' && 'issues' in error) {
        res.status(400).json({ error: "Invalid client data" });
      } else {
        // It's a storage error
        const { status, message } = handleStorageError(error);
        res.status(status).json({ error: message });
      }
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Item routes
  app.get("/api/items", async (req, res) => {
    try {
      const items = await storage.getItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.get("/api/items/:id", async (req, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  app.post("/api/items", async (req, res) => {
    try {
      const validatedData = insertItemSchema.parse(req.body);
      const item = await storage.createItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating item:', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Invalid item data" });
      }
    }
  });

  app.put("/api/items/:id", async (req, res) => {
    try {
      const validatedData = insertItemSchema.partial().parse(req.body);
      const item = await storage.updateItem(req.params.id, validatedData);
      res.json(item);
    } catch (error) {
      // Check if it's a Zod validation error
      if (error && typeof error === 'object' && 'issues' in error) {
        res.status(400).json({ error: "Invalid item data" });
      } else {
        // It's a storage error
        const { status, message } = handleStorageError(error);
        res.status(status).json({ error: message });
      }
    }
  });

  app.patch("/api/items/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ error: "Status is required" });
      }
      
      const validStatuses = ['in-store', 'reserved', 'sold', 'returned-to-vendor'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const item = await storage.updateItem(req.params.id, { status });
      res.json(item);
    } catch (error) {
      console.error("Error updating item status:", error);
      res.status(500).json({ error: "Failed to update item status" });
    }
  });

  app.delete("/api/items/:id", async (req, res) => {
    try {
      await storage.deleteItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // Payment routes
  app.get("/api/payments", async (req, res) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.get("/api/payments/item/:itemId", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByItem(req.params.itemId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments for item" });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const validatedData = insertClientPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      console.error("Payment validation error:", error);
      if (error && typeof error === 'object' && 'errors' in error) {
        res.status(400).json({ error: "Invalid payment data", details: (error as any).errors });
      } else if (error instanceof Error) {
        res.status(400).json({ error: "Invalid payment data", details: error.message });
      } else {
        res.status(400).json({ error: "Invalid payment data" });
      }
    }
  });

  app.put("/api/payments/:id", async (req, res) => {
    try {
      const validatedData = insertClientPaymentSchema.partial().parse(req.body);
      const payment = await storage.updatePayment(req.params.id, validatedData);
      res.json(payment);
    } catch (error) {
      console.error("Payment update error:", error);
      if (error && typeof error === 'object' && 'errors' in error) {
        res.status(400).json({ error: "Invalid payment data", details: (error as any).errors });
      } else if (error instanceof Error) {
        res.status(400).json({ error: "Failed to update payment", details: error.message });
      } else {
        res.status(400).json({ error: "Failed to update payment" });
      }
    }
  });

  app.delete("/api/payments/:id", async (req, res) => {
    try {
      await storage.deletePayment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Payment deletion error:", error);
      res.status(500).json({ error: "Failed to delete payment" });
    }
  });

  // Payment metrics routes
  app.get("/api/payments/metrics", async (req, res) => {
    try {
      const metrics = await storage.getPaymentMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment metrics" });
    }
  });

  app.get("/api/payments/recent", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const payments = await storage.getRecentPayments(limit);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent payments" });
    }
  });

  app.get("/api/payments/upcoming", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const payments = await storage.getUpcomingPayments(limit);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch upcoming payments" });
    }
  });

  app.get("/api/payments/overdue", async (req, res) => {
    try {
      const payments = await storage.getOverduePayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch overdue payments" });
    }
  });

  app.get("/api/financial-health", async (req, res) => {
    try {
      const healthScore = await storage.getFinancialHealthScore();
      res.json(healthScore);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch financial health score" });
    }
  });

  app.patch("/api/installments/:id/mark-paid", async (req, res) => {
    try {
      const installment = await storage.markInstallmentPaid(req.params.id);
      res.json(installment);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark installment as paid" });
    }
  });

  app.post("/api/installments/:id/send-reminder", async (req, res) => {
    try {
      const success = await storage.sendPaymentReminder(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to send payment reminder" });
    }
  });

  // Payout routes
  app.get("/api/payouts", async (req, res) => {
    try {
      const payouts = await storage.getPayouts();
      res.json(payouts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payouts" });
    }
  });

  app.get("/api/payouts/metrics", async (req, res) => {
    try {
      const metrics = await storage.getPayoutMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching payout metrics:", error);
      res.status(500).json({ error: "Failed to fetch payout metrics" });
    }
  });

  app.get("/api/payouts/recent", async (req, res) => {
    try {
      const recentPayouts = await storage.getRecentPayouts();
      res.json(recentPayouts);
    } catch (error) {
      console.error("Error fetching recent payouts:", error);
      res.status(500).json({ error: "Failed to fetch recent payouts" });
    }
  });

  app.get("/api/payouts/upcoming", async (req, res) => {
    try {
      const upcomingPayouts = await storage.getUpcomingPayouts();
      res.json(upcomingPayouts);
    } catch (error) {
      console.error("Error fetching upcoming payouts:", error);
      res.status(500).json({ error: "Failed to fetch upcoming payouts" });
    }
  });

  app.get("/api/payouts/pending", async (req, res) => {
    try {
      const pendingPayouts = await storage.getPendingPayouts();
      res.json(pendingPayouts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending payouts" });
    }
  });

  app.post("/api/payouts", async (req, res) => {
    try {
      const validatedData = insertVendorPayoutSchema.parse(req.body);
      const payout = await storage.createPayout(validatedData);
      res.status(201).json(payout);
    } catch (error) {
      res.status(400).json({ error: "Invalid payout data" });
    }
  });

  // Expense routes
  app.get("/api/expenses", async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/item/:itemId", async (req, res) => {
    try {
      const expenses = await storage.getExpensesByItem(req.params.itemId);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses for item" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    console.log("🔍 [DEBUG] POST /api/expenses - Request received");
    console.log("🔍 [DEBUG] POST /api/expenses - Request body:", req.body);
    
    try {
      console.log("🔍 [DEBUG] POST /api/expenses - Validating with insertItemExpenseSchema");
      const validatedData = insertItemExpenseSchema.parse(req.body);
      console.log("🔍 [DEBUG] POST /api/expenses - Validation successful, validated data:", validatedData);
      
      console.log("🔍 [DEBUG] POST /api/expenses - Creating expense via storage");
      const expense = await storage.createExpense(validatedData);
      console.log("✅ [DEBUG] POST /api/expenses - Expense created successfully:", expense);
      
      res.status(201).json(expense);
    } catch (error) {
      console.error("❌ [DEBUG] POST /api/expenses - Error occurred:", error);
      if (error instanceof Error) {
        console.error("❌ [DEBUG] POST /api/expenses - Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        res.status(400).json({ error: "Invalid expense data", details: error.message });
      } else {
        res.status(400).json({ error: "Invalid expense data" });
      }
    }
  });

  // Installment plan routes
  app.get("/api/installment-plans", async (req, res) => {
    try {
      const plans = await storage.getInstallmentPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch installment plans" });
    }
  });

  app.get("/api/installment-plans/item/:itemId", async (req, res) => {
    try {
      const plans = await storage.getInstallmentPlansByItem(req.params.itemId);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch installment plans for item" });
    }
  });

  app.get("/api/installment-plans/client/:clientId", async (req, res) => {
    try {
      const plans = await storage.getInstallmentPlansByClient(req.params.clientId);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch installment plans for client" });
    }
  });

  app.post("/api/installment-plans", async (req, res) => {
    try {
      const validatedData = insertInstallmentPlanSchema.parse(req.body);
      const plan = await storage.createInstallmentPlan(validatedData);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Installment plan validation error:", error);
      if (error && typeof error === 'object' && 'errors' in error) {
        res.status(400).json({ error: "Invalid installment plan data", details: (error as any).errors });
      } else if (error instanceof Error) {
        res.status(400).json({ error: "Invalid installment plan data", details: error.message });
      } else {
        res.status(400).json({ error: "Invalid installment plan data" });
      }
    }
  });

  app.put("/api/installment-plans/:id", async (req, res) => {
    try {
      const validatedData = insertInstallmentPlanSchema.partial().parse(req.body);
      const plan = await storage.updateInstallmentPlan(req.params.id, validatedData);
      res.json(plan);
    } catch (error) {
      console.error("Installment plan update error:", error);
      if (error && typeof error === 'object' && 'errors' in error) {
        res.status(400).json({ error: "Invalid installment plan data", details: (error as any).errors });
      } else if (error instanceof Error) {
        res.status(400).json({ error: "Failed to update installment plan", details: error.message });
      } else {
        res.status(400).json({ error: "Failed to update installment plan" });
      }
    }
  });

  app.delete("/api/installment-plans/:id", async (req, res) => {
    try {
      await storage.deleteInstallmentPlan(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Installment plan deletion error:", error);
      res.status(500).json({ error: "Failed to delete installment plan" });
    }
  });

  // Configure multer for image uploads (memory storage for processing)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    },
  });

  // Image upload route with compression
  app.post("/api/upload-image", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Compress image using Sharp
      const compressedImageBuffer = await sharp(req.file.buffer)
        .resize(1200, 1200, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 85,
          progressive: true 
        })
        .toBuffer();

      // Get upload URL from object storage
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      // Upload compressed image to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: compressedImageBuffer,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to object storage');
      }

      // Extract the path from the upload URL for public serving
      // uploadURL is like: https://storage.googleapis.com/bucket/public/uploads/uuid.jpg?...
      const url = new URL(uploadURL);
      const pathParts = url.pathname.split('/');
      // Find the uploads part and create the public URL
      const uploadsIndex = pathParts.findIndex(part => part === 'uploads');
      if (uploadsIndex === -1) {
        throw new Error('Invalid upload URL format');
      }
      
      const filename = pathParts[uploadsIndex + 1];
      const publicImageUrl = `/public-objects/uploads/${filename}`;
      
      console.log('Image uploaded successfully:', {
        uploadURL,
        publicImageUrl,
        filename
      });
      
      res.json({ 
        imageUrl: publicImageUrl,
        message: "Image uploaded and compressed successfully" 
      });
    } catch (error) {
      console.error('Image upload error:', error);
      if (error instanceof Error) {
        res.status(500).json({ 
          error: "Failed to upload image", 
          details: error.message 
        });
      } else {
        res.status(500).json({ error: "Failed to upload image" });
      }
    }
  });

  // Serve public objects route
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "Image not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error serving public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
