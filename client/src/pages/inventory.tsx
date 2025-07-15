import { MainLayout } from "@/components/layout/main-layout";

export default function Inventory() {
  return (
    <MainLayout 
      title="Inventory" 
      subtitle="Manage your luxury items inventory"
    >
      <div className="text-center py-16">
        <h3 className="text-2xl font-semibold text-foreground mb-4">Inventory Management</h3>
        <p className="text-muted-foreground">This page will contain inventory management features</p>
      </div>
    </MainLayout>
  );
}
