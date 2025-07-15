import { MainLayout } from "@/components/layout/main-layout";

export default function Expenses() {
  return (
    <MainLayout 
      title="Expenses" 
      subtitle="Track item-related expenses and costs"
    >
      <div className="text-center py-16">
        <h3 className="text-2xl font-semibold text-foreground mb-4">Expense Management</h3>
        <p className="text-muted-foreground">This page will contain expense tracking features</p>
      </div>
    </MainLayout>
  );
}
