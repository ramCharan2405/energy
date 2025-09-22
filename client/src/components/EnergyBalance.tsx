import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Bolt } from "lucide-react";

export default function EnergyBalance() {
  const { user } = useAuth();

  const { data: userData, isLoading } = useQuery({
    queryKey: ["/api/users", user?.walletAddress],
    enabled: !!user?.walletAddress,
  });

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

  return (
    <Card className="bg-card shadow border border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Energy Balance</p>
            <p className="text-2xl font-bold text-foreground" data-testid="text-energy-balance">
              {parseFloat(currentUser?.energyBalance || "0").toFixed(1)}{" "}
              <span className="text-sm text-muted-foreground">kWh</span>
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
