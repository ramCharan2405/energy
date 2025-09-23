import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useToast } from "@/hooks/use-toast";
import { Bolt, Info } from "lucide-react";

export default function Login() {
  const [isConnecting, setIsConnecting] = useState(false);
  const { login } = useAuth();
  const { connect, signMessage, account, isConnected } = useWeb3();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);

      // First connect to MetaMask
      if (!isConnected) {
        await connect();
      }

      // Get nonce from server
      const nonceResponse = await fetch('/api/auth/nonce', { 
        credentials: 'include' 
      });
      const { nonce } = await nonceResponse.json();

      // Create SIWE message
      const domain = window.location.host;
      const origin = window.location.origin;
      const statement = 'Sign in with Ethereum to EnergyMarket';
      
      const siweMessage = `${domain} wants you to sign in with your Ethereum account:\n${account}\n\n${statement}\n\nURI: ${origin}\nVersion: 1\nChain ID: 11155111\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;

      // Sign the SIWE message
      const signature = await signMessage(siweMessage);

      // Authenticate with backend
      await login(siweMessage, signature);

      toast({
        title: "Connected Successfully",
        description: "Welcome to EnergyMarket!",
      });
    } catch (error: any) {
      console.error("Connection error:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-accent/10 p-3 rounded-full">
                <Bolt className="h-12 w-12 text-accent" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-2">EnergyMarket</h1>
            <p className="text-muted-foreground mb-8">Decentralized Electricity Marketplace</p>
            
            <div className="space-y-4">
              <Button
                data-testid="button-connect-metamask"
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
                      alt="MetaMask" 
                      className="w-5 h-5 mr-2"
                    />
                    Connect with MetaMask
                  </>
                )}
              </Button>
              
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Demo Mode Features:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>New users get 1000 kWh demo energy</li>
                      <li>Test on Sepolia network</li>
                      <li>Free SepoliaETH for testing</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
