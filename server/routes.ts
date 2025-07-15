import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertVendorSchema, insertClientSchema, insertItemSchema, 
  insertClientPaymentSchema, insertVendorPayoutSchema, insertItemExpenseSchema, insertInstallmentPlanSchema 
} from "@shared/schema";

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
      res.status(400).json({ error: "Invalid vendor data" });
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
      res.status(400).json({ error: "Invalid client data" });
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
      console.log('Creating item with data:', req.body);
      const validatedData = insertItemSchema.parse(req.body);
      console.log('Validated data:', validatedData);
      const item = await storage.createItem(validatedData);
      console.log('Created item:', item);
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
      res.status(400).json({ error: "Invalid item data" });
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
      res.status(400).json({ error: "Invalid payment data" });
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
    try {
      const validatedData = insertItemExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ error: "Invalid expense data" });
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
      res.status(400).json({ error: "Invalid installment plan data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
