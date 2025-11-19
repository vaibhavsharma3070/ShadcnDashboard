import 'dotenv/config';
import { db } from "../db.js";
import { 
  vendor, 
  client, 
  brand, 
  category, 
  paymentMethod, 
  item,
    clientPayment,
  vendorPayout,
  itemExpense,
  installmentPlan
} from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Seed script to populate database with sample data for testing/development
 * 
 * Usage: npx tsx server/scripts/seed-sample-data.ts
 */

interface SeedResult {
  vendors: number;
  clients: number;
  brands: number;
  categories: number;
  paymentMethods: number;
  items: number;
  payments: number;
  payouts: number;
  expenses: number;
  installments: number;
}

async function seedData(): Promise<SeedResult> {
  console.log("🌱 Starting data seeding...\n");

  // 1. Create Brands
  console.log("📦 Creating brands...");
  const brandData = [
    { name: "Rolex", active: "true" },
    { name: "Omega", active: "true" },
    { name: "Cartier", active: "true" },
    { name: "Tiffany & Co.", active: "true" },
    { name: "Hermès", active: "true" },
    { name: "Louis Vuitton", active: "true" },
    { name: "Chanel", active: "true" },
    { name: "Patek Philippe", active: "true" },
  ];

  const createdBrands = await db.insert(brand).values(brandData).returning();
  console.log(`✅ Created ${createdBrands.length} brands\n`);

  // 2. Create Categories
  console.log("📁 Creating categories...");
  const categoryData = [
    { name: "Watches", active: "true" },
    { name: "Handbags", active: "true" },
    { name: "Jewelry", active: "true" },
    { name: "Accessories", active: "true" },
  ];

  const createdCategories = await db.insert(category).values(categoryData).returning();
  console.log(`✅ Created ${createdCategories.length} categories\n`);

  // 3. Create Payment Methods
  console.log("💳 Creating payment methods...");
  const paymentMethodData = [
    { name: "Cash", active: "true" },
    { name: "Credit Card", active: "true" },
    { name: "Debit Card", active: "true" },
    { name: "Bank Transfer", active: "true" },
    { name: "Check", active: "true" },
  ];

  const createdPaymentMethods = await db.insert(paymentMethod).values(paymentMethodData).returning();
  console.log(`✅ Created ${createdPaymentMethods.length} payment methods\n`);

  // 4. Create Vendors
  console.log("👥 Creating vendors...");
  const vendorData = [
    {
      name: "Luxette Consignment",
      email: "luxette@example.com",
      phone: "+1-555-0101",
      taxId: "TAX-001",
      bankAccountNumber: "1234567890",
      bankName: "Chase Bank",
      accountType: "Checking",
    },
    {
      name: "Maria Rodriguez",
      email: "maria.rodriguez@example.com",
      phone: "+1-555-0102",
      taxId: "TAX-002",
      bankAccountNumber: "2345678901",
      bankName: "Bank of America",
      accountType: "Savings",
    },
    {
      name: "John Smith",
      email: "john.smith@example.com",
      phone: "+1-555-0103",
      taxId: "TAX-003",
      bankAccountNumber: "3456789012",
      bankName: "Wells Fargo",
      accountType: "Checking",
    },
  ];

  const createdVendors = await db.insert(vendor).values(vendorData).returning();
  console.log(`✅ Created ${createdVendors.length} vendors\n`);

  // 5. Create Clients
  console.log("👤 Creating clients...");
  const clientData = [
    {
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      phone: "+1-555-0201",
      billingAddr: "123 Main St, New York, NY 10001",
      idNumber: "ID-001",
    },
    {
      name: "Michael Chen",
      email: "michael.chen@example.com",
      phone: "+1-555-0202",
      billingAddr: "456 Park Ave, Los Angeles, CA 90001",
      idNumber: "ID-002",
    },
    {
      name: "Emily Davis",
      email: "emily.davis@example.com",
      phone: "+1-555-0203",
      billingAddr: "789 Broadway, Chicago, IL 60601",
      idNumber: "ID-003",
    },
  ];

  const createdClients = await db.insert(client).values(clientData).returning();
  console.log(`✅ Created ${createdClients.length} clients\n`);

  // 6. Create Items
  console.log("📦 Creating items...");
  const watchCategory = createdCategories.find(c => c.name === "Watches");
  const jewelryCategory = createdCategories.find(c => c.name === "Jewelry");
  const handbagCategory = createdCategories.find(c => c.name === "Handbags");
  
  const rolexBrand = createdBrands.find(b => b.name === "Rolex");
  const omegaBrand = createdBrands.find(b => b.name === "Omega");
  const cartierBrand = createdBrands.find(b => b.name === "Cartier");
  const hermesBrand = createdBrands.find(b => b.name === "Hermès");
  const lvBrand = createdBrands.find(b => b.name === "Louis Vuitton");

  const itemData = [
    // New sold items for better graph data
    {
      vendorId: createdVendors[0].vendorId,
      brandId: cartierBrand?.brandId,
      categoryId: jewelryCategory?.categoryId,
      title: "Cartier Tank Watch",
      model: "WSTA0029",
      serialNo: "CARTIER-002",
      condition: "Very Good",
      acquisitionDate: "2023-12-10",
      minCost: "3500.00",
      maxCost: "3800.00",
      minSalesPrice: "5500.00",
      maxSalesPrice: "6000.00",
      status: "sold",
    },
    {
      vendorId: createdVendors[2].vendorId,
      brandId: omegaBrand?.brandId,
      categoryId: watchCategory?.categoryId,
      title: "Omega Seamaster 300",
      model: "210.30.42.20.01.001",
      serialNo: "OMEGA-002",
      condition: "Excellent",
      acquisitionDate: "2023-12-20",
      minCost: "4000.00",
      maxCost: "4500.00",
      minSalesPrice: "6500.00",
      maxSalesPrice: "7000.00",
      status: "sold",
    },
  ];

  const createdItems = await db.insert(item).values(itemData).returning();
  console.log(`✅ Created ${createdItems.length} items\n`);

  // 7. Create Payments (for sold items)
  console.log("💰 Creating payments...");
  const cashMethod = createdPaymentMethods.find(pm => pm.name === "Cash");
  const cardMethod = createdPaymentMethods.find(pm => pm.name === "Credit Card");
  const transferMethod = createdPaymentMethods.find(pm => pm.name === "Bank Transfer");

  // Get current date for relative date calculations
  const now = new Date();
  const getDateDaysAgo = (days: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    return date;
  };

  const paymentData = [
    // Payments for new sold items
    {
      itemId: createdItems[0].itemId, // Cartier Tank (sold)
      clientId: createdClients[0].clientId,
      paymentMethod: cardMethod?.name || "Credit Card",
      amount: "6000.00",
      paidAt: getDateDaysAgo(28), // 28 days ago
    },
    {
      itemId: createdItems[1].itemId, // Omega Seamaster (sold)
      clientId: createdClients[1].clientId,
      paymentMethod: transferMethod?.name || "Bank Transfer",
      amount: "7000.00",
      paidAt: getDateDaysAgo(22), // 22 days ago
    },
  ];

  const createdPayments = await db.insert(clientPayment).values(paymentData).returning();
  console.log(`✅ Created ${createdPayments.length} payments\n`);

  // 8. Create Installment Plans
  console.log("📅 Creating installment plans...");
  // No installment plans for new items (all are fully paid)
  const createdInstallments: any[] = [];
  console.log(`✅ Created ${createdInstallments.length} installment plans\n`);

  // 9. Create Vendor Payouts (for sold items)
  console.log("💸 Creating vendor payouts...");
  const payoutData = [
    {
      itemId: createdItems[0].itemId, // Cartier Tank
      vendorId: createdVendors[0].vendorId,
      amount: "3800.00", // maxCost
      paidAt: getDateDaysAgo(26), // 26 days ago
      bankAccount: "1234567890",
      transferId: "TXN-003",
      notes: "Full payout for Cartier Tank sale",
    },
    {
      itemId: createdItems[1].itemId, // Omega Seamaster
      vendorId: createdVendors[2].vendorId,
      amount: "4500.00", // maxCost
      paidAt: getDateDaysAgo(20), // 20 days ago
      bankAccount: "3456789012",
      transferId: "TXN-004",
      notes: "Full payout for Omega Seamaster sale",
    },
  ];

  const createdPayouts = await db.insert(vendorPayout).values(payoutData).returning();
  console.log(`✅ Created ${createdPayouts.length} payouts\n`);

  // 10. Create Expenses - Spread across different dates to show trends in graphs
  console.log("📝 Creating expenses...");

  const expenseData = [
    // Expenses for Cartier Tank (sold) - item index 0
    {
      itemId: createdItems[0].itemId, // Cartier Tank (sold)
      expenseType: "Authentication",
      amount: "120.00",
      incurredAt: getDateDaysAgo(30), // 30 days ago
      notes: "Watch authentication certificate",
    },
    {
      itemId: createdItems[0].itemId, // Cartier Tank
      expenseType: "Service",
      amount: "250.00",
      incurredAt: getDateDaysAgo(29), // 29 days ago
      notes: "Full service and maintenance",
    },
    {
      itemId: createdItems[0].itemId, // Cartier Tank
      expenseType: "Cleaning",
      amount: "75.00",
      incurredAt: getDateDaysAgo(27), // 27 days ago
      notes: "Professional polishing and cleaning",
    },
    {
      itemId: createdItems[0].itemId, // Cartier Tank
      expenseType: "Photography",
      amount: "50.00",
      incurredAt: getDateDaysAgo(26), // 26 days ago
      notes: "Professional watch photography",
    },
    // Expenses for Omega Seamaster (sold) - item index 1
    {
      itemId: createdItems[1].itemId, // Omega Seamaster (sold)
      expenseType: "Authentication",
      amount: "130.00",
      incurredAt: getDateDaysAgo(25), // 25 days ago
      notes: "Watch authentication and certification",
    },
    {
      itemId: createdItems[1].itemId, // Omega Seamaster
      expenseType: "Service",
      amount: "280.00",
      incurredAt: getDateDaysAgo(24), // 24 days ago
      notes: "Full service and water resistance test",
    },
    {
      itemId: createdItems[1].itemId, // Omega Seamaster
      expenseType: "Cleaning",
      amount: "80.00",
      incurredAt: getDateDaysAgo(23), // 23 days ago
      notes: "Professional polishing",
    },
    {
      itemId: createdItems[1].itemId, // Omega Seamaster
      expenseType: "Photography",
      amount: "60.00",
      incurredAt: getDateDaysAgo(21), // 21 days ago
      notes: "Professional watch photography",
    },
    // Additional recent expenses for better graph visualization
    {
      itemId: createdItems[0].itemId, // Cartier Tank
      expenseType: "Insurance",
      amount: "90.00",
      incurredAt: getDateDaysAgo(10), // 10 days ago
      notes: "Insurance premium",
    },
    {
      itemId: createdItems[1].itemId, // Omega Seamaster
      expenseType: "Storage",
      amount: "50.00",
      incurredAt: getDateDaysAgo(5), // 5 days ago
      notes: "Monthly storage fee",
    },
    {
      itemId: createdItems[0].itemId, // Cartier Tank
      expenseType: "Repair",
      amount: "150.00",
      incurredAt: getDateDaysAgo(3), // 3 days ago
      notes: "Minor adjustment and repair",
    },
    {
      itemId: createdItems[1].itemId, // Omega Seamaster
      expenseType: "Battery Replacement",
      amount: "40.00",
      incurredAt: getDateDaysAgo(1), // 1 day ago
      notes: "Battery replacement",
    },
  ];

  const createdExpenses = await db.insert(itemExpense).values(expenseData).returning();
  console.log(`✅ Created ${createdExpenses.length} expenses\n`);

  return {
    vendors: createdVendors.length,
    clients: createdClients.length,
    brands: createdBrands.length,
    categories: createdCategories.length,
    paymentMethods: createdPaymentMethods.length,
    items: createdItems.length,
    payments: createdPayments.length,
    payouts: createdPayouts.length,
    expenses: createdExpenses.length,
    installments: createdInstallments.length,
  };
}

async function clearExistingData() {
  console.log("🧹 Clearing existing data...\n");
  
  // Delete in reverse order of dependencies
  await db.delete(installmentPlan);
  await db.delete(itemExpense);
  await db.delete(vendorPayout);
  await db.delete(clientPayment);
  await db.delete(item);
  await db.delete(client);
  await db.delete(vendor);
  await db.delete(paymentMethod);
  await db.delete(category);
  await db.delete(brand);
  
  console.log("✅ Existing data cleared\n");
}

async function main() {
  try {
    // Ask user if they want to clear existing data
    const args = process.argv.slice(2);
    const shouldClear = args.includes('--clear') || args.includes('-c');
    
    if (shouldClear) {
      await clearExistingData();
    }

    const result = await seedData();

    console.log("=".repeat(50));
    console.log("✅ Data seeding completed successfully!\n");
    console.log("Summary:");
    console.log(`  📦 Brands: ${result.brands}`);
    console.log(`  📁 Categories: ${result.categories}`);
    console.log(`  💳 Payment Methods: ${result.paymentMethods}`);
    console.log(`  👥 Vendors: ${result.vendors}`);
    console.log(`  👤 Clients: ${result.clients}`);
    console.log(`  📦 Items: ${result.items}`);
    console.log(`  💰 Payments: ${result.payments}`);
    console.log(`  💸 Payouts: ${result.payouts}`);
    console.log(`  📝 Expenses: ${result.expenses}`);
    console.log(`  📅 Installments: ${result.installments}`);
    console.log("=".repeat(50));
    console.log("\n🎉 You can now login and explore the system!");
    console.log("   Email: admin@luxette.com");
    console.log("   Password: admin123\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
}

main();
