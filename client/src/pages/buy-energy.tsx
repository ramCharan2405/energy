import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShoppingCart, Circle } from "lucide-react";
import { EnergyListing } from "@shared/schema";

export default function BuyEnergy() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sortBy, setSortBy] = useState("price");
  const [purchaseAmounts, setPurchaseAmounts] = useState<{ [key: string]: string }>({});

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["/api/listings"],
  });

  const buyEnergyMutation = useMutation({
    mutationFn: async (data: { buyerId: string; listingId: string; amount: string }) => {
      return apiRequest("POST", "/api/transactions/buy", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Purchase Successful",
        description: "Energy has been purchased successfully!",
      });
      setPurchaseAmounts({});
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase energy",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = async (listing: EnergyListing) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to purchase energy",
        variant: "destructive",
      });
      return;
    }

    const amount = purchaseAmounts[listing.id];
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to purchase",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(amount) > parseFloat(listing.amountKWh)) {
      toast({
        title: "Insufficient Energy",
        description: "Not enough energy available in this listing",
        variant: "destructive",
      });
      return;
    }

    await buyEnergyMutation.mutateAsync({
      buyerId: user.id,
      listingId: listing.id,
      amount,
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const generateAvatar = (address: string) => {
    const colors = ["from-primary to-accent", "from-secondary to-primary", "from-accent to-secondary"];
    const colorIndex = parseInt(address.slice(-1), 16) % colors.length;
    return colors[colorIndex];
  };

  const getUserInitials = (address: string) => {
    return address.slice(2, 4).toUpperCase();
  };

  let sortedListings = (listingsData as any)?.listings || [];
  
  if (sortBy === "price") {
    sortedListings = [...sortedListings].sort((a, b) => parseFloat(a.ratePerKWh) - parseFloat(b.ratePerKWh));
  } else if (sortBy === "amount") {
    sortedListings = [...sortedListings].sort((a, b) => parseFloat(b.amountKWh) - parseFloat(a.amountKWh));
  }

  const activeListingsCount = sortedListings.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Energy Marketplace</h2>
        <div className="flex items-center space-x-4">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48" data-testid="select-sort-by">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price">Sort by Price</SelectItem>
              <SelectItem value="amount">Sort by Amount</SelectItem>
              <SelectItem value="seller">Sort by Seller</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Circle className="h-3 w-3 fill-secondary text-secondary" />
            <span data-testid="text-active-listings-count">{activeListingsCount} Active Listings</span>
          </div>
        </div>
      </div>
      
      {listingsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-muted rounded-full"></div>
                      <div className="space-y-1">
                        <div className="h-4 bg-muted rounded w-24"></div>
                        <div className="h-3 bg-muted rounded w-16"></div>
                      </div>
                    </div>
                    <div className="h-5 bg-muted rounded w-16"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-8 bg-muted rounded"></div>
                    <div className="h-8 bg-muted rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activeListingsCount === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Active Listings</h3>
          <p className="text-muted-foreground">
            There are currently no energy listings available for purchase.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedListings.map((listing: any) => (
            <Card key={listing.id} className="bg-card shadow border border-border" data-testid={`listing-card-${listing.id}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${generateAvatar(listing.seller?.walletAddress || "")} rounded-full flex items-center justify-center`}>
                      <span className="text-white font-medium text-sm">
                        {getUserInitials(listing.seller?.walletAddress || "")}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground" data-testid={`text-seller-address-${listing.id}`}>
                        {formatAddress(listing.seller?.walletAddress || "")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatAddress(listing.seller?.walletAddress || "")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                    Verified
                  </Badge>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-medium text-foreground" data-testid={`text-available-amount-${listing.id}`}>
                      {parseFloat(listing.amountKWh).toFixed(1)} kWh
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate:</span>
                    <span className="font-medium text-foreground" data-testid={`text-rate-${listing.id}`}>
                      {parseFloat(listing.ratePerKWh).toFixed(4)} ETH/kWh
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Value:</span>
                    <span className="font-bold text-primary" data-testid={`text-total-value-${listing.id}`}>
                      {parseFloat(listing.totalValue).toFixed(4)} ETH
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`amount-${listing.id}`} className="block text-sm font-medium text-foreground mb-1">
                      Amount to Buy (kWh)
                    </Label>
                    <Input
                      id={`amount-${listing.id}`}
                      data-testid={`input-purchase-amount-${listing.id}`}
                      type="number"
                      placeholder="50"
                      max={listing.amountKWh}
                      value={purchaseAmounts[listing.id] || ""}
                      onChange={(e) => setPurchaseAmounts(prev => ({
                        ...prev,
                        [listing.id]: e.target.value
                      }))}
                      className="w-full"
                    />
                  </div>
                  <Button
                    data-testid={`button-buy-energy-${listing.id}`}
                    onClick={() => handlePurchase(listing)}
                    disabled={buyEnergyMutation.isPending || listing.sellerId === user?.id}
                    className="w-full bg-primary text-primary-foreground hover:opacity-90"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {buyEnergyMutation.isPending ? "Purchasing..." : 
                     listing.sellerId === user?.id ? "Your Listing" : "Buy Energy"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
