import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import Vendors from "@/pages/vendors";
import Clients from "@/pages/clients";
import Payments from "@/pages/payments";
import Payouts from "@/pages/payouts";
import Expenses from "@/pages/expenses";
import Reports from "@/pages/reports";
import Profitability from "@/pages/profitability";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/vendors" component={Vendors} />
      <Route path="/clients" component={Clients} />
      <Route path="/payments" component={Payments} />
      <Route path="/payouts" component={Payouts} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/reports" component={Reports} />
      <Route path="/profitability" component={Profitability} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
