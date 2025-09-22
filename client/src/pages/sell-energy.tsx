import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { z } from "zod";

const createListingSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine((val) => parseFloat(val) > 0, "Amount must be greater than 0"),
  rate: z.string().min(1, "Rate is required").refine((val) => parseFloat(val) > 0, "Rate must be greater than 0"),
});

export default function SellEnergy() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("0.0001");

  const { data: userData } = useQuery({
    queryKey: ["/api/users", user?.walletAddress],
    enabled: !!user?.walletAddress,
  });

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["/api/listings/user", user?.id],
    enabled: !!user?.id,
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

  const deleteListingMutation = useMutation({
    mutationFn: async (listingId: string) => {
      return apiRequest("DELETE", `/api/listings/${listingId}`, { userId: user?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      toast({
        title: "Listing Cancelled",
        description: "Your listing has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel listing",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = createListingSchema.parse({ amount, rate });
      
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
      }
    }
  };

  const currentUser = (userData as any)?.user || user;
  const amountNum = parseFloat(amount || "0");
  const rateNum = parseFloat(rate || "0");
  const expectedEarnings = amountNum * rateNum;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card className="bg-card shadow border border-border mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">Sell Your Energy</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="sell-amount" className="block text-sm font-medium text-foreground mb-2">
                  Amount to Sell
                </Label>
                <div className="relative">
                  <Input
                    id="sell-amount"
                    data-testid="input-sell-amount"
                    type="number"
                    placeholder="100"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pr-12"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                    kWh
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Available: <span className="font-medium" data-testid="text-available-energy">{parseFloat(currentUser?.energyBalance || "0").toFixed(1)} kWh</span>
                </p>
              </div>
              
              <div>
                <Label htmlFor="sell-rate" className="block text-sm font-medium text-foreground mb-2">
                  Rate per kWh
                </Label>
                <div className="relative">
                  <Input
                    id="sell-rate"
                    data-testid="input-sell-rate"
                    type="number"
                    step="0.0001"
                    placeholder="0.0001"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full pr-12"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                    ETH
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Market avg: <span className="font-medium">0.0001 ETH/kWh</span>
                </p>
              </div>
            </div>
            
            <Card className="bg-muted">
              <CardContent className="p-4">
                <h4 className="font-medium text-foreground mb-2">Transaction Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Energy:</span>
                    <span className="font-medium text-foreground" data-testid="text-summary-energy">
                      {amountNum.toFixed(1)} kWh
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate:</span>
                    <span className="font-medium text-foreground" data-testid="text-summary-rate">
                      {rateNum.toFixed(4)} ETH/kWh
                    </span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="text-foreground font-medium">Expected Earnings:</span>
                    <span className="font-bold text-secondary" data-testid="text-summary-earnings">
                      {expectedEarnings.toFixed(4)} ETH
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Button
              data-testid="button-create-listing"
              type="submit"
              disabled={createListingMutation.isPending}
              className="w-full bg-secondary text-secondary-foreground py-3 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4 mr-2" />
              {createListingMutation.isPending ? "Creating Listing..." : "Create Listing"}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Active Listings */}
      <Card className="bg-card shadow border border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Your Active Listings</CardTitle>
        </CardHeader>
        <CardContent>
          {listingsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : !(listingsData as any)?.listings || (listingsData as any).listings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active listings yet</p>
              <p className="text-sm">Create your first energy listing above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(listingsData as any).listings.map((listing: any) => (
                <div
                  key={listing.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                  data-testid={`listing-${listing.id}`}
                >
                  <div>
                    <p className="font-medium text-foreground" data-testid={`text-listing-details-${listing.id}`}>
                      {parseFloat(listing.amountKWh).toFixed(1)} kWh @ {parseFloat(listing.ratePerKWh).toFixed(4)} ETH/kWh
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-listing-created-${listing.id}`}>
                      Listed {formatDistanceToNow(new Date(listing.createdAt))} ago
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                      {listing.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      data-testid={`button-delete-listing-${listing.id}`}
                      onClick={() => deleteListingMutation.mutate(listing.id)}
                      disabled={deleteListingMutation.isPending}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
