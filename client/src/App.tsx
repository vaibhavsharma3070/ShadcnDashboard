import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import ItemDetails from "@/pages/item-details";
import Vendors from "@/pages/vendors";
import VendorDetails from "@/pages/vendor-details";
import Clients from "@/pages/clients";
import ClientDetails from "@/pages/client-details";
import Contracts from "@/pages/contracts";
import Payments from "@/pages/payments";
import Payouts from "@/pages/payouts";
import Expenses from "@/pages/expenses";
import Reports from "@/pages/reports";
import Profitability from "@/pages/profitability";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import { Loader2, Crown } from "lucide-react";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2 mb-6">
          <Crown className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 dark:from-amber-400 dark:to-amber-300 bg-clip-text text-transparent">
            LUXETTE
          </h1>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600 dark:text-amber-400" />
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/item/:id" component={ItemDetails} />
      <Route path="/vendors" component={Vendors} />
      <Route path="/vendor/:vendorId" component={VendorDetails} />
      <Route path="/clients" component={Clients} />
      <Route path="/client/:clientId" component={ClientDetails} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/payments" component={Payments} />
      <Route path="/payouts" component={Payouts} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/reports" component={Reports} />
      <Route path="/profitability" component={Profitability} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <ProtectedRoute>
      <Router />
    </ProtectedRoute>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <AuthenticatedApp />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
