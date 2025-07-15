import { MainLayout } from "@/components/layout/main-layout";

export default function Clients() {
  return (
    <MainLayout 
      title="Clients" 
      subtitle="Manage client relationships and purchases"
    >
      <div className="text-center py-16">
        <h3 className="text-2xl font-semibold text-foreground mb-4">Client Management</h3>
        <p className="text-muted-foreground">This page will contain client management features</p>
      </div>
    </MainLayout>
  );
}
