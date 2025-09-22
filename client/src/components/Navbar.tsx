import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { Bolt, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { account, disconnect } = useWeb3();

  const handleDisconnect = () => {
    logout();
    disconnect();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/sell", label: "Sell Energy" },
    { href: "/buy", label: "Buy Energy" },
    { href: "/history", label: "History" },
  ];

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0 flex items-center">
              <Bolt className="h-8 w-8 text-accent mr-2" />
              <span className="text-xl font-bold text-foreground">EnergyMarket</span>
            </Link>
            
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-1 pt-1 pb-4 text-sm font-medium transition-colors",
                    location === item.href
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  data-testid={`link-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-secondary rounded-full"></div>
              <span className="text-muted-foreground">Sepolia</span>
            </div>
            
            <Button
              data-testid="button-wallet-address"
              onClick={handleDisconnect}
              variant="default"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Wallet className="h-4 w-4 mr-2" />
              <span data-testid="text-wallet-address">
                {account ? formatAddress(account) : "Connect Wallet"}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
