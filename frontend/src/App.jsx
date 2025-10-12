import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import MarketplacePage from "./pages/MarketplacePage";
import HistoryPage from "./pages/HistoryPage";
import DebugBalances from "./pages/DebugBalances";
import DiagnosticPage from "./pages/DiagnosticPage";
import useStore from "./store/useStore";
import {
  isMetaMaskInstalled,
  resetConnection,
  getEthBalance,
  getTokenBalance,
} from "./services/web3";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const wallet = useStore((state) => state.wallet);
  const setWallet = useStore((state) => state.setWallet);
  const updateBalances = useStore((state) => state.updateBalances);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const disconnectWallet = useStore((state) => state.disconnectWallet);
  const reset = useStore((state) => state.reset);

  useEffect(() => {
    console.log("[App] Initializing MetaMask listeners...");

    // Set up MetaMask event listeners
    if (isMetaMaskInstalled()) {
      // Handle account changes
      const handleAccountsChanged = async (accounts) => {
        console.log("[App] Account changed:", accounts);

        if (accounts.length === 0) {
          // User disconnected wallet
          console.log("[App] No accounts - user disconnected");
          toast.error("Wallet disconnected");
          disconnectWallet();
          reset();
        } else if (accounts[0] !== wallet.address) {
          // User switched accounts
          console.log("[App] Account switched to:", accounts[0]);
          resetConnection();

          try {
            // Update wallet state with new account
            const [ethBal, tokenBal] = await Promise.all([
              getEthBalance(accounts[0]),
              getTokenBalance(accounts[0]),
            ]);

            setWallet({
              address: accounts[0],
              chainId: wallet.chainId || 11155111,
              ethBalance: ethBal,
            });
            updateBalances(ethBal, tokenBal);

            toast.success("Account switched successfully");
          } catch (error) {
            console.error("[App] Error updating account:", error);
            toast.error("Failed to update account");
          }
        }
      };

      // Handle chain changes
      const handleChainChanged = (chainIdHex) => {
        const chainId = parseInt(chainIdHex, 16);
        console.log("[App] Chain changed to:", chainId);

        if (chainId !== 11155111) {
          toast.error("Please switch to Sepolia network");
          // Force page reload to reset connection
          window.location.reload();
        } else {
          setWallet({ chainId });
        }
      };

      // Add listeners
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      // Auto-reconnect if wallet was previously connected
      const autoReconnect = async () => {
        if (isAuthenticated && wallet.address) {
          console.log("[App] Auto-reconnecting wallet...");
          try {
            const accounts = await window.ethereum.request({
              method: "eth_accounts",
            });

            if (accounts.length > 0 && accounts[0] === wallet.address) {
              console.log("[App] Wallet still connected:", accounts[0]);
              // Refresh balances
              const [ethBal, tokenBal] = await Promise.all([
                getEthBalance(accounts[0]),
                getTokenBalance(accounts[0]),
              ]);
              updateBalances(ethBal, tokenBal);
            } else if (accounts.length === 0) {
              console.log("[App] Wallet disconnected - clearing state");
              disconnectWallet();
            }
          } catch (error) {
            console.error("[App] Auto-reconnect error:", error);
          }
        }
      };

      autoReconnect();

      // Cleanup listeners on unmount
      return () => {
        console.log("[App] Cleaning up MetaMask listeners");
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener(
            "accountsChanged",
            handleAccountsChanged
          );
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [
    isAuthenticated,
    wallet.address,
    wallet.chainId,
    setWallet,
    updateBalances,
    disconnectWallet,
    reset,
  ]);

  return (
    <Router>
      <div className="min-h-screen bg-carbon-900 text-white">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/debug" element={<DebugBalances />} />
          <Route path="/diagnostic" element={<DiagnosticPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/marketplace"
            element={
              <ProtectedRoute>
                <MarketplacePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#1a2332",
              color: "#fff",
              border: "1px solid rgba(0, 255, 65, 0.2)",
              borderRadius: "12px",
              boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
            },
            success: {
              iconTheme: {
                primary: "#00ff41",
                secondary: "#1a2332",
              },
            },
            error: {
              iconTheme: {
                primary: "#ff006e",
                secondary: "#1a2332",
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
