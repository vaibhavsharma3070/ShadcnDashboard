/**
 * Metrics service - handles payment and payout metrics calculations
 */

import { db } from '../db.js';
import { clientPayment, installmentPlan, item, vendor, client } from '@shared/schema';
import { eq, sql, and, gte, lte, desc, count } from 'drizzle-orm';
import type { ClientPayment, InstallmentPlan, Item, Vendor, Client } from '@shared/schema';

export async function getPaymentMetrics(): Promise<{
  totalPaymentsReceived: number;
  totalPaymentsAmount: number;
  overduePayments: number;
  upcomingPayments: number;
  averagePaymentAmount: number;
  monthlyPaymentTrend: number;
}> {
  // Total payments received
  const [paymentStats] = await db
    .select({
      totalCount: count(),
      totalAmount: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
      avgAmount: sql<number>`COALESCE(AVG(${clientPayment.amount}), 0)`,
    })
    .from(clientPayment);

  // Overdue payments (past due installments)
  const today = new Date();
  const [overdueResult] = await db
    .select({
      count: count(),
    })
    .from(installmentPlan)
    .where(
      and(
        eq(installmentPlan.status, "pending"),
        lte(installmentPlan.dueDate, today.toISOString().slice(0, 10))
      )
    );

  // Upcoming payments (active installments due in next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const [upcomingResult] = await db
    .select({
      count: count(),
    })
    .from(installmentPlan)
    .where(
      and(
        eq(installmentPlan.status, "pending"),
        gte(installmentPlan.dueDate, today.toISOString().slice(0, 10)),
        lte(installmentPlan.dueDate, thirtyDaysFromNow.toISOString().slice(0, 10))
      )
    );

  // Monthly trend (compare last 30 days to previous 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [currentMonthStats] = await db
    .select({
      amount: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
    })
    .from(clientPayment)
    .where(gte(clientPayment.paidAt, thirtyDaysAgo));

  const [previousMonthStats] = await db
    .select({
      amount: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
    })
    .from(clientPayment)
    .where(
      and(
        gte(clientPayment.paidAt, sixtyDaysAgo),
        lte(clientPayment.paidAt, thirtyDaysAgo)
      )
    );

  const currentAmount = Number(currentMonthStats.amount);
  const previousAmount = Number(previousMonthStats.amount);
  const monthlyTrend = previousAmount > 0
    ? ((currentAmount - previousAmount) / previousAmount) * 100
    : 0;

  return {
    totalPaymentsReceived: Number(paymentStats.totalCount),
    totalPaymentsAmount: Number(paymentStats.totalAmount),
    overduePayments: Number(overdueResult.count),
    upcomingPayments: Number(upcomingResult.count),
    averagePaymentAmount: Number(paymentStats.avgAmount),
    monthlyPaymentTrend: monthlyTrend,
  };
}