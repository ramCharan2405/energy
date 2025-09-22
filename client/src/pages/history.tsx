import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { ArrowUp, ArrowDown, Gift } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Transaction } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function History() {
  const { user } = useAuth();
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("30");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/transactions/user", user?.id],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-48" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b border-border">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!(data as any)?.transactions) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">Transaction History</h2>
          <p className="text-muted-foreground">No transactions found</p>
        </div>
      </div>
    );
  }

  const transactions = (data as any).transactions;

  // Filter transactions based on type
  const filteredByType = transactions.filter((transaction: Transaction) => {
    if (transactionFilter === "all") return true;
    if (transactionFilter === "buy") return transaction.buyerId === user?.id;
    if (transactionFilter === "sell") return transaction.sellerId === user?.id;
    return true;
  });

  // Filter by time (for demo, we'll show all for now since we don't have enough data)
  const filteredTransactions = filteredByType;

  // Calculate summary statistics
  const totalBought = transactions
    .filter((t: Transaction) => t.buyerId === user?.id && t.transactionType !== "demo")
    .reduce((sum: number, t: Transaction) => sum + parseFloat(t.amountKWh), 0);

  const totalSold = transactions
    .filter((t: Transaction) => t.sellerId === user?.id && t.transactionType !== "demo")
    .reduce((sum: number, t: Transaction) => sum + parseFloat(t.amountKWh), 0);

  const totalSpent = transactions
    .filter((t: Transaction) => t.buyerId === user?.id && t.transactionType !== "demo")
    .reduce((sum: number, t: Transaction) => sum + parseFloat(t.totalCost), 0);

  const totalEarned = transactions
    .filter((t: Transaction) => t.sellerId === user?.id && t.transactionType !== "demo")
    .reduce((sum: number, t: Transaction) => sum + parseFloat(t.totalCost), 0);

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.transactionType === "demo") {
      return <Gift className="h-4 w-4 text-accent" />;
    }
    
    const isSale = transaction.sellerId === user?.id;
    return isSale 
      ? <ArrowUp className="h-4 w-4 text-secondary" />
      : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const getTransactionType = (transaction: Transaction) => {
    if (transaction.transactionType === "demo") return "Demo";
    const isSale = transaction.sellerId === user?.id;
    return isSale ? "Sell" : "Buy";
  };

  const getTransactionColor = (transaction: Transaction) => {
    if (transaction.transactionType === "demo") return "text-accent";
    const isSale = transaction.sellerId === user?.id;
    return isSale ? "text-secondary" : "text-primary";
  };

  const getCounterparty = (transaction: Transaction) => {
    if (transaction.transactionType === "demo") {
      return { name: "System", address: "Demo Energy" };
    }
    
    const isSale = transaction.sellerId === user?.id;
    const counterparty = isSale ? (transaction as any).buyer : (transaction as any).seller;
    
    if (!counterparty) return { name: "Unknown", address: "Unknown" };
    
    const address = counterparty.walletAddress;
    return {
      name: `${address.slice(0, 6)}...${address.slice(-4)}`,
      address: `${address.slice(0, 6)}...${address.slice(-4)}`
    };
  };

  const getTransactionTotal = (transaction: Transaction) => {
    if (transaction.transactionType === "demo") {
      return `+${parseFloat(transaction.amountKWh).toFixed(1)} kWh`;
    }
    
    const isSale = transaction.sellerId === user?.id;
    const amount = parseFloat(transaction.totalCost).toFixed(4);
    return isSale ? `+${amount} ETH` : `-${amount} ETH`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Transaction History</h2>
        <div className="flex items-center space-x-4">
          <Select value={transactionFilter} onValueChange={setTransactionFilter}>
            <SelectTrigger className="w-48" data-testid="select-transaction-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="buy">Buy Orders</SelectItem>
              <SelectItem value="sell">Sell Orders</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-32" data-testid="select-time-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card shadow border border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Bought</p>
            <p className="text-xl font-bold text-primary" data-testid="text-total-bought">
              {totalBought.toFixed(1)} kWh
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow border border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Sold</p>
            <p className="text-xl font-bold text-secondary" data-testid="text-total-sold">
              {totalSold.toFixed(1)} kWh
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow border border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-xl font-bold text-primary" data-testid="text-total-spent">
              {totalSpent.toFixed(4)} ETH
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow border border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Earned</p>
            <p className="text-xl font-bold text-secondary" data-testid="text-total-earned">
              {totalEarned.toFixed(4)} ETH
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Transaction Table */}
      <Card className="bg-card shadow border border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Counterparty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      No transactions found for the selected filters
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction: any) => {
                    const counterparty = getCounterparty(transaction);
                    return (
                      <tr key={transaction.id} className="hover:bg-muted/50" data-testid={`transaction-row-${transaction.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg mr-3 ${
                              transaction.transactionType === "demo" 
                                ? "bg-accent/10" 
                                : transaction.sellerId === user?.id 
                                  ? "bg-secondary/10" 
                                  : "bg-primary/10"
                            }`}>
                              {getTransactionIcon(transaction)}
                            </div>
                            <span className={`text-sm font-medium ${getTransactionColor(transaction)}`} data-testid={`text-transaction-type-${transaction.id}`}>
                              {getTransactionType(transaction)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-foreground" data-testid={`text-counterparty-name-${transaction.id}`}>
                              {counterparty.name}
                            </p>
                            <p className="text-xs text-muted-foreground" data-testid={`text-counterparty-address-${transaction.id}`}>
                              {counterparty.address}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-transaction-amount-${transaction.id}`}>
                          {parseFloat(transaction.amountKWh).toFixed(1)} kWh
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-transaction-rate-${transaction.id}`}>
                          {transaction.transactionType === "demo" 
                            ? "Free" 
                            : `${parseFloat(transaction.ratePerKWh).toFixed(4)} ETH`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" data-testid={`text-transaction-total-${transaction.id}`}>
                          <span className={getTransactionColor(transaction)}>
                            {getTransactionTotal(transaction)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground" data-testid={`text-transaction-date-${transaction.id}`}>
                          {formatDistanceToNow(new Date(transaction.createdAt))} ago
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="secondary" className="bg-secondary/10 text-secondary" data-testid={`badge-transaction-status-${transaction.id}`}>
                            {transaction.status === "completed" ? "Completed" : transaction.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
