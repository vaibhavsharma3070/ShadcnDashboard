import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  UserCheck,
  CreditCard,
  Banknote,
  Receipt,
  BarChart3,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

const bottomNavItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/inventory", icon: Package, label: "Inventory" },
  { href: "/vendors", icon: Users, label: "Vendors" },
  { href: "/clients", icon: UserCheck, label: "Clients" },
  { href: "more", icon: Menu, label: "More" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around py-2 px-4">
        {bottomNavItems.map((item) => {
          const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
          const Icon = item.icon;
          
          if (item.href === "more") {
            return (
              <Sheet key="more">
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex flex-col items-center gap-1 px-3 py-2 h-auto min-h-[48px]"
                    data-testid="button-mobile-menu"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">More</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <Sidebar />
                </SheetContent>
              </Sheet>
            );
          }

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className={`flex flex-col items-center gap-1 px-3 py-2 h-auto min-h-[48px] ${
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}