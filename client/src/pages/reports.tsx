import { MainLayout } from "@/components/layout/main-layout";

export default function Reports() {
  return (
    <MainLayout 
      title="Reports" 
      subtitle="Generate business reports and analytics"
    >
      <div className="text-center py-16">
        <h3 className="text-2xl font-semibold text-foreground mb-4">Business Reports</h3>
        <p className="text-muted-foreground">This page will contain reporting and analytics features</p>
      </div>
    </MainLayout>
  );
}
