import { MainLayout } from "@/components/layout/main-layout";

export default function Profitability() {
  return (
    <MainLayout 
      title="Profitability" 
      subtitle="Analyze profit margins and performance"
    >
      <div className="text-center py-16">
        <h3 className="text-2xl font-semibold text-foreground mb-4">Profitability Analysis</h3>
        <p className="text-muted-foreground">This page will contain profitability analysis features</p>
      </div>
    </MainLayout>
  );
}
