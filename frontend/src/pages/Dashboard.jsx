import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FaWallet,
  FaBolt,
  FaExchangeAlt,
  FaChartLine,
  FaHistory,
  FaShoppingCart,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import toast from "react-hot-toast";
import useStore from "../store/useStore";
import AnimatedBackground from "../components/animated/AnimatedBackground";
import { getEthBalance, getTokenBalance } from "../services/web3";
import {
  getUserStats,
  getRecentActivity,
  getMarketStats,
} from "../services/api";
import {
  formatAddress,
  formatNumber,
  formatTokenAmount,
  formatRelativeTime,
} from "../utils/helpers";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const wallet = useStore((state) => state.wallet);
  const updateBalances = useStore((state) => state.updateBalances);
  const logout = useStore((state) => state.reset);

  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [marketStats, setMarketStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load balances
      console.log("🔍 loadDashboardData - wallet.address:", wallet.address);
      if (wallet.address) {
        console.log("✅ Wallet address exists, fetching balances...");
        try {
          const [ethBal, tokenBal] = await Promise.all([
            getEthBalance(wallet.address),
            getTokenBalance(wallet.address),
          ]);
          console.log("✅ Fetched balances - ETH:", ethBal, "ENGC:", tokenBal);
          updateBalances(ethBal, tokenBal);
        } catch (balanceError) {
          console.error("❌ Error fetching balances:", balanceError);
          toast.error("Failed to fetch wallet balances");
        }
      } else {
        console.warn("⚠️ No wallet address found! Cannot fetch balances.");
        toast.error("Wallet not connected. Please reconnect.");
      }

      // Load stats and activity
      const [userStatsData, activityData, marketData] = await Promise.all([
        getUserStats().catch((err) => {
          console.error("Error fetching user stats:", err);
          return {
            data: {
              totalListings: 0,
              activeSales: 0,
              totalPurchases: 0,
              totalVolume: 0,
            },
          };
        }),
        getRecentActivity(10).catch((err) => {
          console.error("Error fetching recent activity:", err);
          return { data: [] };
        }),
        getMarketStats().catch((err) => {
          console.error("Error fetching market stats:", err);
          return {
            data: {
              totalListings: 0,
              activeListings: 0,
              totalVolume: 0,
              averagePrice: 0,
            },
          };
        }),
      ]);

      setStats(userStatsData.data);
      setRecentActivity(activityData.data || []);
      setMarketStats(marketData.data);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Load dashboard on mount and when wallet changes
  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.address]);

  const handleLogout = () => {
    logout();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
    toast.success("Logged out successfully");
  };

  console.log("Current wallet state:", {
    ethBalance: wallet.ethBalance,
    tokenBalance: wallet.tokenBalance,
  });

  const statCards = [
    {
      title: "ETH Balance",
      value: formatTokenAmount(wallet.ethBalance, 4),
      icon: FaWallet,
      color: "from-neon-cyan to-blue-500",
      unit: "ETH",
    },
    {
      title: "ENGC Balance",
      value: formatTokenAmount(wallet.tokenBalance, 2),
      icon: FaBolt,
      color: "from-neon-green to-green-500",
      unit: "ENGC",
    },
    {
      title: "My Listings",
      value: stats?.totalListings || 0,
      icon: FaShoppingCart,
      color: "from-neon-purple to-purple-500",
    },
    {
      title: "Total Trades",
      value: (stats?.totalPurchases || 0) + (stats?.activeSales || 0),
      icon: FaExchangeAlt,
      color: "from-neon-pink to-pink-500",
    },
  ];

  const chartData = [
    { name: "Mon", volume: 12, transactions: 4 },
    { name: "Tue", volume: 19, transactions: 7 },
    { name: "Wed", volume: 15, transactions: 5 },
    { name: "Thu", volume: 25, transactions: 9 },
    { name: "Fri", volume: 22, transactions: 8 },
    { name: "Sat", volume: 30, transactions: 12 },
    { name: "Sun", volume: 28, transactions: 10 },
  ];

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />

      {/* Navbar */}
      <nav className="relative z-10 glass border-b border-carbon-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-neon-green to-neon-cyan rounded-lg flex items-center justify-center">
                <FaBolt className="text-xl text-carbon-900" />
              </div>
              <span className="text-xl font-bold gradient-text">
                Energy Credits
              </span>
            </div>

            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/marketplace")}
                className="px-4 py-2 glass rounded-lg hover:border-neon-green transition-colors"
              >
                Marketplace
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/history")}
                className="px-4 py-2 glass rounded-lg hover:border-neon-cyan transition-colors"
              >
                History
              </motion.button>
              <div className="glass px-4 py-2 rounded-lg">
                <span className="text-sm text-gray-400">Wallet: </span>
                <span className="text-neon-green font-mono">
                  {formatAddress(wallet.address)}
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Logout
              </motion.button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">
                Welcome back, {user?.username}!
              </h1>
              <p className="text-gray-400">
                Here's your energy trading overview
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                console.log("Manual refresh triggered");
                loadDashboardData();
              }}
              className="neon-button flex items-center gap-2"
            >
              <FaBolt className="animate-pulse" />
              Refresh Balances
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="hover-card"
            >
              <div
                className={`bg-gradient-to-br ${card.color} p-0.5 rounded-2xl`}
              >
                <div className="bg-carbon-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <card.icon className="text-3xl text-neon-green" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-2 h-2 bg-neon-green rounded-full"
                    />
                  </div>
                  <h3 className="text-gray-400 text-sm mb-1">{card.title}</h3>
                  <p className="text-3xl font-bold text-white">
                    {card.value}{" "}
                    {card.unit && (
                      <span className="text-xl text-gray-400">{card.unit}</span>
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Trading Volume Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FaChartLine className="text-neon-cyan" />
              Weekly Volume
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c3956" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a2332",
                    border: "1px solid rgba(0, 255, 65, 0.2)",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="#00ff41"
                  strokeWidth={2}
                  dot={{ fill: "#00ff41" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Transaction Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FaExchangeAlt className="text-neon-green" />
              Transactions
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c3956" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a2332",
                    border: "1px solid rgba(0, 255, 65, 0.2)",
                    borderRadius: "8px",
                  }}
                />
                <Bar
                  dataKey="transactions"
                  fill="url(#colorGradient)"
                  radius={[8, 8, 0, 0]}
                />
                <defs>
                  <linearGradient
                    id="colorGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#00ff41" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FaHistory className="text-neon-purple" />
              Recent Activity
            </h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/history")}
              className="text-sm text-neon-cyan hover:text-neon-green transition-colors"
            >
              View All →
            </motion.button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="neon-spinner" />
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="glass p-4 rounded-lg hover:border-neon-green transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-neon-green to-neon-cyan rounded-lg flex items-center justify-center">
                      <FaBolt className="text-carbon-900" />
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {activity.type || "Transaction"}
                      </p>
                      <p className="text-sm text-gray-400">
                        {formatRelativeTime(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-neon-green">
                      {formatNumber(activity.amount || 0)} ENGC
                    </p>
                    <p className="text-sm text-gray-400">
                      {activity.status || "Completed"}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FaHistory className="text-6xl text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No recent activity</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/marketplace")}
                className="mt-4 neon-button"
              >
                Start Trading
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <motion.button
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/marketplace")}
            className="glass-card text-left group"
          >
            <FaShoppingCart className="text-4xl text-neon-green mb-4 group-hover:animate-bounce" />
            <h3 className="text-lg font-semibold mb-2">Browse Marketplace</h3>
            <p className="text-sm text-gray-400">
              Discover and purchase energy credits
            </p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/marketplace?tab=sell")}
            className="glass-card text-left group"
          >
            <FaBolt className="text-4xl text-neon-cyan mb-4 group-hover:animate-pulse" />
            <h3 className="text-lg font-semibold mb-2">Sell Energy Credits</h3>
            <p className="text-sm text-gray-400">
              List your energy credits for sale
            </p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/history")}
            className="glass-card text-left group"
          >
            <FaHistory className="text-4xl text-neon-purple mb-4 group-hover:animate-spin" />
            <h3 className="text-lg font-semibold mb-2">View History</h3>
            <p className="text-sm text-gray-400">
              Check your transaction history
            </p>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
