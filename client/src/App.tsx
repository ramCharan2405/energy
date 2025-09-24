import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import { Web3Provider } from "./contexts/Web3Context";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import SellEnergy from "@/pages/sell-energy";
import BuyEnergy from "@/pages/buy-energy";
import History from "@/pages/history";
import Navbar from "./components/Navbar";
import { useAuth } from "./contexts/AuthContext";

function ProtectedRoute({
  component: Component,
}: {
  component: () => JSX.Element;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <>
      <Navbar />
      <Component />
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route
        path="/"
        component={() => <ProtectedRoute component={Dashboard} />}
      />
      <Route
        path="/dashboard"
        component={() => <ProtectedRoute component={Dashboard} />}
      />
      <Route
        path="/sell"
        component={() => <ProtectedRoute component={SellEnergy} />}
      />
      <Route
        path="/buy"
        component={() => <ProtectedRoute component={BuyEnergy} />}
      />
      <Route
        path="/history"
        component={() => <ProtectedRoute component={History} />}
      />
      <Route path="/login" component={Login} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Web3Provider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </Web3Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
