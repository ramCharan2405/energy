import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { Skeleton } from "@/components/ui/skeleton";
import { Bolt } from "lucide-react";
import { useEffect } from "react";

export default function EnergyBalance() {
  const { user } = useAuth();
  const { energyBalance, isConnected, refreshBalances } = useWeb3();

  const { data: userData, isLoading } = useQuery({
    queryKey: ["/api/users", user?.walletAddress],
    enabled: !!user?.walletAddress,
  });

  // Refresh balances when component mounts and user is connected
  useEffect(() => {
    if (isConnected && user?.walletAddress) {
      refreshBalances();
    }
  }, [isConnected, user?.walletAddress, refreshBalances]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentUser = (userData as any)?.user || user;
  // Use real blockchain balance if available, fallback to database balance
  const displayBalance = energyBalance !== null ? energyBalance : (currentUser?.energyBalance || "0");

  return (
    <Card className="bg-card shadow border border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">ENGY Balance</p>
            <p className="text-2xl font-bold text-foreground" data-testid="text-energy-balance">
              {parseFloat(displayBalance).toFixed(1)}{" "}
              <span className="text-sm text-muted-foreground">ENGY</span>
              {energyBalance !== null && <span className="text-xs text-green-500 ml-1">● Live</span>}
            </p>
          </div>
          <div className="bg-secondary/10 p-3 rounded-lg">
            <Bolt className="h-6 w-6 text-secondary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
