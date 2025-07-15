import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  Handshake, 
  Users, 
  CreditCard, 
  DollarSign, 
  Receipt, 
  TrendingUp, 
  BarChart3,
  Gem,
  Settings,
  User
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { 
    name: "Management", 
    items: [
      { name: "Inventory", href: "/inventory", icon: Package },
      { name: "Vendors", href: "/vendors", icon: Handshake },
      { name: "Clients", href: "/clients", icon: Users },
    ]
  },
  {
    name: "Financial",
    items: [
      { name: "Payments", href: "/payments", icon: CreditCard },
      { name: "Payouts", href: "/payouts", icon: DollarSign },
      { name: "Expenses", href: "/expenses", icon: Receipt },
    ]
  },
  {
    name: "Analytics",
    items: [
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Profitability", href: "/profitability", icon: TrendingUp },
    ]
  }
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-72 bg-white dark:bg-gray-900 sidebar-shadow flex flex-col border-r border-border">
      {/* Logo/Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-primary to-purple-600 rounded-lg flex items-center justify-center">
            <Gem className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">LuxeConsign</h1>
            <p className="text-sm text-muted-foreground">Management System</p>
          </div>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 py-6 space-y-1">
        {navigation.map((item) => (
          <div key={item.name}>
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 mx-2 text-sm font-medium rounded-lg transition-colors",
                  location === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ) : (
              <>
                <div className="px-4 py-2 mt-6 first:mt-0">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {item.name}
                  </h3>
                </div>
                {item.items?.map((subItem) => (
                  <Link
                    key={subItem.name}
                    href={subItem.href}
                    className={cn(
                      "flex items-center px-4 py-3 mx-2 text-sm font-medium rounded-lg transition-colors",
                      location === subItem.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <subItem.icon className="mr-3 h-5 w-5" />
                    {subItem.name}
                  </Link>
                ))}
              </>
            )}
          </div>
        ))}
      </nav>
      
      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Salomón Cohen</p>
            <p className="text-xs text-muted-foreground">Owner</p>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
