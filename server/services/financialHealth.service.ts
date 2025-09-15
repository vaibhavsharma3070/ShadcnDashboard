/**
 * Financial Health service - calculates financial health scores and recommendations
 */

import { db } from '../db.js';
import { clientPayment, vendorPayout, item, installmentPlan, client } from '@shared/schema';
import { eq, sql, and, gte, lte, count } from 'drizzle-orm';

export async function getFinancialHealthScore(): Promise<{
  score: number;
  grade: string;
  factors: {
    paymentTimeliness: number;
    cashFlow: number;
    inventoryTurnover: number;
    profitMargin: number;
    clientRetention: number;
  };
  recommendations: string[];
}> {
  const recommendations: string[] = [];

  // 1. Payment Timeliness (25 points max)
  const [overdueStats] = await db
    .select({
      overdueCount: count(),
    })
    .from(installmentPlan)
    .where(
      and(
        eq(installmentPlan.status, "active"),
        lte(installmentPlan.nextDueDate, new Date())
      )
    );

  const [totalInstallments] = await db
    .select({
      totalCount: count(),
    })
    .from(installmentPlan)
    .where(eq(installmentPlan.status, "active"));

  const overdueRate = Number(totalInstallments.totalCount) > 0
    ? Number(overdueStats.overdueCount) / Number(totalInstallments.totalCount)
    : 0;

  const paymentTimelinessScore = Math.max(0, 25 * (1 - overdueRate));

  if (overdueRate > 0.2) {
    recommendations.push("High number of overdue payments. Consider implementing automated payment reminders.");
  }

  // 2. Cash Flow (25 points max)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [inflowStats] = await db
    .select({
      totalInflow: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
    })
    .from(clientPayment)
    .where(gte(clientPayment.paidAt, thirtyDaysAgo));

  const [outflowStats] = await db
    .select({
      totalOutflow: sql<number>`COALESCE(SUM(${vendorPayout.amount}), 0)`,
    })
    .from(vendorPayout)
    .where(gte(vendorPayout.paidAt, thirtyDaysAgo));

  const netCashFlow = Number(inflowStats.totalInflow) - Number(outflowStats.totalOutflow);
  const cashFlowRatio = Number(outflowStats.totalOutflow) > 0
    ? Number(inflowStats.totalInflow) / Number(outflowStats.totalOutflow)
    : 2;

  const cashFlowScore = Math.min(25, Math.max(0, cashFlowRatio * 12.5));

  if (netCashFlow < 0) {
    recommendations.push("Negative cash flow detected. Review payment terms and collection processes.");
  }

  // 3. Inventory Turnover (20 points max)
  const [inventoryStats] = await db
    .select({
      activeItems: count(),
    })
    .from(item)
    .where(sql`${item.status} IN ('in-store', 'reserved')`);

  const [soldStats] = await db
    .select({
      soldItems: count(),
    })
    .from(item)
    .where(eq(item.status, "sold"));

  const turnoverRate = Number(inventoryStats.activeItems) > 0
    ? Number(soldStats.soldItems) / (Number(soldStats.soldItems) + Number(inventoryStats.activeItems))
    : 0;

  const inventoryTurnoverScore = Math.min(20, turnoverRate * 20);

  if (turnoverRate < 0.3) {
    recommendations.push("Low inventory turnover. Consider promotions or adjusting pricing strategy.");
  }

  // 4. Profit Margin (20 points max)
  const [profitStats] = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
    })
    .from(clientPayment);

  const [costStats] = await db
    .select({
      totalCost: sql<number>`COALESCE(SUM(${item.minCost}), 0)`,
    })
    .from(item)
    .where(eq(item.status, "sold"));

  const revenue = Number(profitStats.totalRevenue);
  const costs = Number(costStats.totalCost);
  const profitMarginRate = revenue > 0 ? (revenue - costs) / revenue : 0;

  const profitMarginScore = Math.min(20, Math.max(0, profitMarginRate * 40));

  if (profitMarginRate < 0.2) {
    recommendations.push("Low profit margins. Review pricing strategy and cost management.");
  }

  // 5. Client Retention (10 points max)
  const [uniqueClients] = await db
    .select({
      totalClients: sql<number>`COUNT(DISTINCT ${clientPayment.clientId})`,
    })
    .from(clientPayment);

  const [repeatClients] = await db
    .select({
      clientId: clientPayment.clientId,
      purchaseCount: sql<number>`COUNT(DISTINCT ${clientPayment.itemId})`,
    })
    .from(clientPayment)
    .groupBy(clientPayment.clientId)
    .having(sql`COUNT(DISTINCT ${clientPayment.itemId}) > 1`);

  const retentionRate = Number(uniqueClients.totalClients) > 0
    ? repeatClients.length / Number(uniqueClients.totalClients)
    : 0;

  const clientRetentionScore = Math.min(10, retentionRate * 20);

  if (retentionRate < 0.3) {
    recommendations.push("Low client retention rate. Consider loyalty programs or improved customer service.");
  }

  // Calculate total score
  const totalScore = Math.round(
    paymentTimelinessScore +
    cashFlowScore +
    inventoryTurnoverScore +
    profitMarginScore +
    clientRetentionScore
  );

  // Determine grade
  let grade: string;
  if (totalScore >= 90) {
    grade = "A+";
    if (recommendations.length === 0) {
      recommendations.push("Excellent financial health! Continue current practices.");
    }
  } else if (totalScore >= 80) {
    grade = "A";
  } else if (totalScore >= 70) {
    grade = "B";
  } else if (totalScore >= 60) {
    grade = "C";
  } else if (totalScore >= 50) {
    grade = "D";
  } else {
    grade = "F";
    recommendations.push("Immediate attention required to improve financial health.");
  }

  return {
    score: totalScore,
    grade,
    factors: {
      paymentTimeliness: Math.round(paymentTimelinessScore),
      cashFlow: Math.round(cashFlowScore),
      inventoryTurnover: Math.round(inventoryTurnoverScore),
      profitMargin: Math.round(profitMarginScore),
      clientRetention: Math.round(clientRetentionScore),
    },
    recommendations,
  };
}