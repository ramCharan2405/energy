import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ChartLine } from "lucide-react";
import WalletBalance from "@/components/WalletBalance";
import EnergyBalance from "@/components/EnergyBalance";
import TransactionTable from "@/components/TransactionTable";
import { z } from "zod";

const quickSellSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine((val) => parseFloat(val) > 0, "Amount must be greater than 0"),
  rate: z.string().min(1, "Rate is required").refine((val) => parseFloat(val) > 0, "Rate must be greater than 0"),
});

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("0.0001");

  const { data: userData } = useQuery({
    queryKey: ["/api/users", user?.walletAddress],
    enabled: !!user?.walletAddress,
  });

  const createListingMutation = useMutation({
    mutationFn: async (data: { sellerId: string; amountKWh: string; ratePerKWh: string; totalValue: string; isActive: boolean }) => {
      return apiRequest("POST", "/api/listings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Listing Created",
        description: "Your energy listing has been created successfully!",
      });
      setAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create listing",
        variant: "destructive",
      });
    },
  });

  const handleQuickSell = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = quickSellSchema.parse({ amount, rate });
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const amountNum = parseFloat(validatedData.amount);
      const rateNum = parseFloat(validatedData.rate);
      const totalValue = amountNum * rateNum;

      await createListingMutation.mutateAsync({
        sellerId: user.id,
        amountKWh: validatedData.amount,
        ratePerKWh: validatedData.rate,
        totalValue: totalValue.toString(),
        isActive: true,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0]?.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create listing",
          variant: "destructive",
        });
      }
    }
  };

  const currentUser = (userData as any)?.user || user;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <WalletBalance />
        <EnergyBalance />
        
        <Card className="bg-card shadow border border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-earnings">
                  {parseFloat(currentUser?.totalEarnings || "0").toFixed(4)}{" "}
                  <span className="text-sm text-muted-foreground">ETH</span>
                </p>
              </div>
              <div className="bg-accent/10 p-3 rounded-lg">
                <ChartLine className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-card shadow border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Quick Sell</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleQuickSell} className="space-y-4">
              <div>
                <Label htmlFor="amount" className="block text-sm font-medium text-foreground mb-2">
                  Amount (kWh)
                </Label>
                <Input
                  id="amount"
                  data-testid="input-quick-sell-amount"
                  type="number"
                  placeholder="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Available: <span className="font-medium">{parseFloat(currentUser?.energyBalance || "0").toFixed(1)} kWh</span>
                </p>
              </div>
              
              <div>
                <Label htmlFor="rate" className="block text-sm font-medium text-foreground mb-2">
                  Rate (ETH/kWh)
                </Label>
                <Input
                  id="rate"
                  data-testid="input-quick-sell-rate"
                  type="number"
                  step="0.0001"
                  placeholder="0.0001"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <Button
                data-testid="button-create-listing"
                type="submit"
                disabled={createListingMutation.isPending}
                className="w-full bg-secondary text-secondary-foreground hover:opacity-90"
              >
                {createListingMutation.isPending ? "Creating..." : "Create Listing"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionTable limit={3} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
