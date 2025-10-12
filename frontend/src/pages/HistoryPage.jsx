import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FaBolt,
  FaHistory,
  FaFilter,
  FaDownload,
  FaExternalLinkAlt,
  FaArrowUp,
  FaArrowDown,
  FaCoins,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useStore from "../store/useStore";
import AnimatedBackground from "../components/animated/AnimatedBackground";
import { getMyTransactions, getTransactionStats } from "../services/api";
import {
  formatAddress,
  formatNumber,
  formatTokenAmount,
  formatDate,
} from "../utils/helpers";

const HistoryPage = () => {
  const navigate = useNavigate();
  const wallet = useStore((state) => state.wallet);

  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterAndSortTransactions();
  }, [transactions, filterType, searchQuery, sortBy]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const [txResponse, statsResponse] = await Promise.all([
        getMyTransactions(),
        getTransactionStats(),
      ]);
      setTransactions(txResponse.data || []);
      setStats(statsResponse.data || {});
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load transaction history");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTransactions = () => {
    let filtered = [...transactions];

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((tx) => tx.type === filterType);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (tx) =>
          tx.txHash?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.listing?.location
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortBy === "amount") {
        return (b.listing?.energyAmount || 0) - (a.listing?.energyAmount || 0);
      } else if (sortBy === "value") {
        return (b.amount || 0) - (a.amount || 0);
      }
      return 0;
    });

    setFilteredTransactions(filtered);
  };

  const exportTransactions = () => {
    try {
      const csv = [
        [
          "Date",
          "Type",
          "Energy Amount",
          "Price",
          "Total Value",
          "Status",
          "TX Hash",
        ],
        ...filteredTransactions.map((tx) => [
          formatDate(tx.createdAt),
          tx.type,
          tx.listing?.energyAmount || "N/A",
          tx.listing?.pricePerUnit || "N/A",
          tx.amount || "N/A",
          tx.status,
          tx.txHash,
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions_${Date.now()}.csv`;
      a.click();
      toast.success("Export successful!");
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export transactions");
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case "buy":
        return <FaArrowDown className="text-neon-cyan" />;
      case "sell":
        return <FaArrowUp className="text-neon-green" />;
      case "mint":
        return <FaCoins className="text-neon-purple" />;
      default:
        return <FaHistory />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-neon-green";
      case "pending":
        return "text-yellow-500";
      case "failed":
        return "text-neon-pink";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />

      {/* Navbar */}
      <nav className="relative z-10 glass border-b border-carbon-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-neon-green to-neon-cyan rounded-lg flex items-center justify-center">
                <FaHistory className="text-xl text-carbon-900" />
              </div>
              <span className="text-xl font-bold gradient-text">
                Transaction History
              </span>
            </motion.button>

            <div className="flex items-center gap-4">
              <div className="glass px-4 py-2 rounded-lg">
                <span className="text-sm text-gray-400">Balance: </span>
                <span className="text-neon-green font-mono">
                  {formatTokenAmount(wallet.tokenBalance, 2)} ENGC
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 glass rounded-lg hover:border-neon-green transition-colors"
              >
                Dashboard
              </motion.button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400 mb-1">
                    Total Transactions
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {formatNumber(stats.totalTransactions || 0)}
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-neon-green to-neon-cyan rounded-lg flex items-center justify-center">
                  <FaHistory className="text-2xl text-carbon-900" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Total Volume</div>
                  <div className="text-3xl font-bold gradient-text">
                    {formatNumber(stats.totalVolume || 0)} kWh
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-neon-cyan to-neon-purple rounded-lg flex items-center justify-center">
                  <FaBolt className="text-2xl text-carbon-900" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Total Spent</div>
                  <div className="text-3xl font-bold text-neon-cyan">
                    {formatTokenAmount(stats.totalSpent || 0, 2)} ENGC
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-neon-purple to-neon-pink rounded-lg flex items-center justify-center">
                  <FaArrowDown className="text-2xl text-carbon-900" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Total Earned</div>
                  <div className="text-3xl font-bold text-neon-green">
                    {formatTokenAmount(stats.totalEarned || 0, 2)} ENGC
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-neon-green to-neon-cyan rounded-lg flex items-center justify-center">
                  <FaArrowUp className="text-2xl text-carbon-900" />
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <div className="glass-card mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by TX hash or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="neon-input"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="neon-input"
              >
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Energy</option>
                <option value="value">Sort by Value</option>
              </select>

              {["all", "buy", "sell", "mint"].map((type) => (
                <motion.button
                  key={type}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filterType === type
                      ? "bg-gradient-to-r from-neon-green to-neon-cyan text-carbon-900"
                      : "glass hover:border-neon-green"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </motion.button>
              ))}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportTransactions}
                className="px-4 py-2 glass rounded-lg hover:border-neon-green"
              >
                <FaDownload className="inline mr-2" />
                Export
              </motion.button>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="neon-spinner" />
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="space-y-4">
            {filteredTransactions.map((tx, index) => (
              <motion.div
                key={tx._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                      {getTransactionIcon(tx.type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`neon-badge ${
                            tx.type === "buy"
                              ? "bg-neon-cyan/20"
                              : tx.type === "sell"
                              ? "bg-neon-green/20"
                              : "bg-neon-purple/20"
                          }`}
                        >
                          {tx.type.toUpperCase()}
                        </span>
                        <span
                          className={`text-sm font-medium ${getStatusColor(
                            tx.status
                          )}`}
                        >
                          {tx.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">
                            Energy Amount
                          </div>
                          <div className="text-white font-semibold">
                            {tx.listing?.energyAmount
                              ? `${formatNumber(tx.listing.energyAmount)} kWh`
                              : "N/A"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-400 mb-1">
                            Price per Unit
                          </div>
                          <div className="text-white font-semibold">
                            {tx.listing?.pricePerUnit
                              ? `${formatTokenAmount(
                                  tx.listing.pricePerUnit,
                                  4
                                )} ENGC`
                              : "N/A"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-400 mb-1">
                            Total Value
                          </div>
                          <div className="text-neon-green font-bold">
                            {tx.amount
                              ? `${formatTokenAmount(tx.amount, 2)} ENGC`
                              : "N/A"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-400 mb-1">
                            Location
                          </div>
                          <div className="text-white font-semibold">
                            {tx.listing?.location || "N/A"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <div className="text-gray-400">
                          {formatDate(tx.createdAt)}
                        </div>
                        {tx.txHash && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neon-cyan hover:text-neon-green transition-colors flex items-center gap-1"
                          >
                            <span className="font-mono">
                              {formatAddress(tx.txHash)}
                            </span>
                            <FaExternalLinkAlt size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass-card text-center py-20">
            <FaHistory className="text-6xl text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No transactions yet</h3>
            <p className="text-gray-400 mb-6">
              Start trading to see your transaction history
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/marketplace")}
              className="neon-button"
            >
              Go to Marketplace
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
