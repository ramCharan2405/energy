import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, Gift } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Transaction } from "@shared/schema";

interface TransactionTableProps {
  limit?: number;
}

export default function TransactionTable({ limit }: TransactionTableProps) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/transactions/user", user?.id],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!(data as any)?.transactions) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No transactions yet</p>
      </div>
    );
  }

  const transactions = limit ? (data as any).transactions.slice(0, limit) : (data as any).transactions;

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.transactionType === "demo") {
      return <Gift className="h-4 w-4 text-accent" />;
    }
    
    const isSale = transaction.sellerId === user?.id;
    return isSale 
      ? <ArrowUp className="h-4 w-4 text-secondary" />
      : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const getTransactionAmount = (transaction: Transaction) => {
    if (transaction.transactionType === "demo") {
      return `+${parseFloat(transaction.amountKWh).toFixed(1)} kWh`;
    }
    
    const isSale = transaction.sellerId === user?.id;
    const amount = parseFloat(transaction.totalCost).toFixed(4);
    return isSale ? `+${amount} ETH` : `-${amount} ETH`;
  };

  const getTransactionColor = (transaction: Transaction) => {
    if (transaction.transactionType === "demo") return "text-accent";
    const isSale = transaction.sellerId === user?.id;
    return isSale ? "text-secondary" : "text-primary";
  };

  const getCounterparty = (transaction: Transaction) => {
    if (transaction.transactionType === "demo") {
      return "System";
    }
    
    const isSale = transaction.sellerId === user?.id;
    const counterparty = isSale ? (transaction as any).buyer : (transaction as any).seller;
    
    if (!counterparty) return "Unknown";
    
    const address = counterparty.walletAddress;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTransactionDescription = (transaction: Transaction) => {
    if (transaction.transactionType === "demo") {
      return "Demo Energy Received";
    }
    
    const isSale = transaction.sellerId === user?.id;
    const amount = parseFloat(transaction.amountKWh).toFixed(1);
    return isSale ? `Sold ${amount} kWh` : `Bought ${amount} kWh`;
  };

  return (
    <div className="space-y-3">
      {transactions.map((transaction: any) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
          data-testid={`transaction-${transaction.id}`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              transaction.transactionType === "demo" 
                ? "bg-accent/10" 
                : transaction.sellerId === user?.id 
                  ? "bg-secondary/10" 
                  : "bg-primary/10"
            }`}>
              {getTransactionIcon(transaction)}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground" data-testid={`text-transaction-description-${transaction.id}`}>
                {getTransactionDescription(transaction)}
              </p>
              <p className="text-xs text-muted-foreground" data-testid={`text-transaction-counterparty-${transaction.id}`}>
                {getCounterparty(transaction)} • {formatDistanceToNow(new Date(transaction.createdAt))} ago
              </p>
            </div>
          </div>
          <span className={`text-sm font-medium ${getTransactionColor(transaction)}`} data-testid={`text-transaction-amount-${transaction.id}`}>
            {getTransactionAmount(transaction)}
          </span>
        </div>
      ))}
    </div>
  );
}
