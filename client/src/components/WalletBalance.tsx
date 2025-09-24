import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

export default function WalletBalance() {
  const { user } = useAuth();
  const { ethBalance, isConnected, refreshBalances } = useWeb3();

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
  const displayBalance = ethBalance !== null ? ethBalance : (currentUser?.ethBalance || "0");

  return (
    <Card className="bg-card shadow border border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">SepoliaETH Balance</p>
            <p className="text-2xl font-bold text-foreground" data-testid="text-eth-balance">
              {parseFloat(displayBalance).toFixed(4)}
              {ethBalance !== null && <span className="text-xs text-green-500 ml-1">● Live</span>}
            </p>
          </div>
          <div className="bg-primary/10 p-3 rounded-lg">
            <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
