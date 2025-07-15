import { MainLayout } from "@/components/layout/main-layout";

export default function Payouts() {
  return (
    <MainLayout 
      title="Payouts" 
      subtitle="Manage vendor payouts and commissions"
    >
      <div className="text-center py-16">
        <h3 className="text-2xl font-semibold text-foreground mb-4">Vendor Payouts</h3>
        <p className="text-muted-foreground">This page will contain vendor payout management features</p>
      </div>
    </MainLayout>
  );
}
