import { MainLayout } from "@/components/layout/main-layout";

export default function Vendors() {
  return (
    <MainLayout 
      title="Vendors" 
      subtitle="Manage vendor relationships and consignments"
    >
      <div className="text-center py-16">
        <h3 className="text-2xl font-semibold text-foreground mb-4">Vendor Management</h3>
        <p className="text-muted-foreground">This page will contain vendor management features</p>
      </div>
    </MainLayout>
  );
}
