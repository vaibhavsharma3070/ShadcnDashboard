import { MainLayout } from "@/components/layout/main-layout";

export default function Payments() {
  return (
    <MainLayout 
      title="Payments" 
      subtitle="Track and process client payments"
    >
      <div className="text-center py-16">
        <h3 className="text-2xl font-semibold text-foreground mb-4">Payment Processing</h3>
        <p className="text-muted-foreground">This page will contain payment processing features</p>
      </div>
    </MainLayout>
  );
}
