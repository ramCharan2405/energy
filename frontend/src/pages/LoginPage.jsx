import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { FaWallet, FaBolt } from "react-icons/fa";
import {
  connectWallet,
  signMessage,
  isMetaMaskInstalled,
  getTokenBalance,
} from "../services/web3";
import { getNonce, login } from "../services/api";
import useStore from "../store/useStore";
import AnimatedBackground from "../components/animated/AnimatedBackground";

const LoginPage = () => {
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);
  const setToken = useStore((state) => state.setToken);
  const setWallet = useStore((state) => state.setWallet);
  const updateBalances = useStore((state) => state.updateBalances);
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Check if already authenticated
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleConnect = async () => {
    if (!isMetaMaskInstalled()) {
      toast.error("Please install MetaMask to continue!", {
        duration: 4000,
        icon: "🦊",
      });
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    setConnecting(true);
    const loadingToast = toast.loading("Connecting to MetaMask...");

    try {
      // Step 1: Connect wallet
      console.log("[LoginPage] Starting wallet connection...");
      const walletData = await connectWallet();
      console.log("[LoginPage] Wallet connected:", walletData);
      toast.success("Wallet connected!", { id: loadingToast });

      // Step 2: Get token balance FIRST
      console.log("[LoginPage] Fetching token balance...");
      const tokenBalance = await getTokenBalance(walletData.address);
      console.log("[LoginPage] Token balance:", tokenBalance);

      // Step 3: Set wallet with ALL data including balances
      console.log("[LoginPage] Setting wallet state with balances...");
      setWallet({
        address: walletData.address,
        chainId: walletData.chainId,
        ethBalance: walletData.ethBalance,
        tokenBalance: tokenBalance, // Include token balance in wallet state
        isConnected: true,
      });

      // Also update balances separately for redundancy
      updateBalances(walletData.ethBalance, tokenBalance);

      console.log("[LoginPage] Wallet state updated. Current state:", {
        address: walletData.address,
        ethBalance: walletData.ethBalance,
        tokenBalance: tokenBalance,
      });

      // Step 4: Get nonce for signing
      setLoading(true);
      toast.loading("Preparing authentication message...", {
        id: loadingToast,
      });

      console.log("[LoginPage] Getting nonce...");
      const nonceResponse = await getNonce(walletData.address);
      const message = nonceResponse.data.message;

      // Step 5: Sign message
      toast.loading("Please sign the message in MetaMask...", {
        id: loadingToast,
      });
      console.log("[LoginPage] Requesting signature...");
      console.log("[LoginPage] Message to sign:", message);

      let signature;
      try {
        signature = await signMessage(message);
        console.log("[LoginPage] Signature received:", signature);
      } catch (signError) {
        console.error("[LoginPage] Signature error:", signError);
        if (
          signError.code === 4001 ||
          signError.message?.includes("User rejected")
        ) {
          throw new Error("User rejected the signature request");
        }
        throw new Error(`Failed to sign message: ${signError.message}`);
      }

      // Step 6: Login with signature
      toast.loading("Authenticating...", { id: loadingToast });
      console.log("[LoginPage] Logging in...");
      const loginResponse = await login(walletData.address, signature, message);
      console.log("[LoginPage] Login successful:", loginResponse);

      // Step 7: Save auth data
      setUser(loginResponse.user);
      setToken(loginResponse.token);
      console.log("[LoginPage] User and token saved to store");

      // Check if this is a new user (wallet address just created)
      const isNewUser = loginResponse.user && !loginResponse.user.lastLogin;

      toast.success(
        isNewUser
          ? "🎉 Welcome! Account created and 50 ENGC minted!"
          : "✨ Welcome back!",
        { id: loadingToast, duration: 3000 }
      );

      // Navigate to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (error) {
      console.error("Connection error:", error);
      let errorMessage = "Failed to connect wallet";

      if (error.message.includes("User rejected")) {
        errorMessage = "Connection request was rejected";
      } else if (error.message.includes("MetaMask")) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      toast.error(errorMessage, { id: loadingToast, duration: 4000 });
    } finally {
      setConnecting(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo/Title */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-block mb-6"
            >
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-neon-green to-neon-cyan rounded-2xl flex items-center justify-center shadow-2xl box-glow">
                <FaBolt className="text-4xl text-carbon-900" />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-5xl font-bold gradient-text mb-3"
            >
              Energy Credits
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 text-lg"
            >
              Virtual Energy Credit Marketplace
            </motion.p>
          </div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="glass-card text-center"
          >
            <h2 className="text-2xl font-semibold text-white mb-4">
              Connect Your Wallet
            </h2>

            <p className="text-gray-400 mb-8">
              Sign in with MetaMask to access the marketplace
            </p>

            <button
              onClick={handleConnect}
              disabled={connecting || loading}
              className="neon-button w-full text-lg py-4 flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              <FaWallet className="text-xl group-hover:animate-bounce" />
              <span>
                {connecting
                  ? "Connecting..."
                  : loading
                  ? "Authenticating..."
                  : "Connect MetaMask"}
              </span>
            </button>

            {!isMetaMaskInstalled() && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 text-sm text-yellow-400 flex items-center justify-center gap-2"
              >
                <span>🦊</span>
                <span>MetaMask not detected. Click above to install.</span>
              </motion.p>
            )}

            <div className="mt-8 pt-6 border-t border-carbon-600">
              <p className="text-xs text-gray-500">
                By connecting, you agree to our Terms of Service
              </p>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-12 grid grid-cols-3 gap-4"
          >
            {[
              { icon: "⚡", label: "Fast Trading" },
              { icon: "🔒", label: "Secure" },
              { icon: "🌐", label: "Decentralized" },
            ].map((feature, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                className="glass text-center py-4 rounded-xl"
              >
                <div className="text-3xl mb-2">{feature.icon}</div>
                <div className="text-xs text-gray-400">{feature.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Floating elements */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-20 left-10 text-6xl opacity-20"
      >
        ⚡
      </motion.div>

      <motion.div
        animate={{
          y: [0, 20, 0],
          rotate: [0, -5, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-20 right-10 text-6xl opacity-20"
      >
        🔋
      </motion.div>
    </div>
  );
};

export default LoginPage;
