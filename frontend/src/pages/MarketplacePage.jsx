import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBolt,
  FaFilter,
  FaSearch,
  FaPlus,
  FaTimes,
  FaShoppingCart,
  FaWallet,
} from "react-icons/fa";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import useStore from "../store/useStore";
import AnimatedBackground from "../components/animated/AnimatedBackground";
import {
  getListings,
  createListing as createListingAPI,
  completePurchase,
} from "../services/api";
import {
  createListing as createListingBlockchain,
  buyListing,
  approveTokens,
  getTokenBalance,
  getEthBalance,
} from "../services/web3";
import {
  formatAddress,
  formatNumber,
  formatTokenAmount,
  formatRelativeTime,
} from "../utils/helpers";

const MarketplacePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useStore((state) => state.user);
  const wallet = useStore((state) => state.wallet);
  const updateBalances = useStore((state) => state.updateBalances);

  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);

  const [createForm, setCreateForm] = useState({
    energyAmount: "",
    pricePerUnit: "",
    location: "",
    listingType: "sell",
    expiryDays: "7",
  });

  // Define loadListings function
  const loadListings = async () => {
    try {
      setLoading(true);
      const response = await getListings();
      console.log("[Marketplace] Full response:", response);

      // Backend returns: { success: true, message: "...", data: { listings: [...], pagination: {...} } }
      const listingsData = response.data?.listings || [];
      console.log("[Marketplace] Extracted listings:", listingsData);

      if (!Array.isArray(listingsData)) {
        console.error("[Marketplace] listings is not an array:", listingsData);
        setListings([]);
        return;
      }

      // Map database fields to frontend expectations
      const mappedListings = listingsData.map((listing) => ({
        ...listing,
        // Map database field names to frontend expected names
        energyAmount: listing.amountInTokens,
        pricePerUnit: listing.pricePerTokenInETH,
        listingType: "sell", // All listings are sell listings in current marketplace
        // Ensure seller is properly structured
        seller: listing.seller || {},
      }));

      console.log("[Marketplace] Mapped listings:", mappedListings);
      setListings(mappedListings);
    } catch (error) {
      console.error("Error loading listings:", error);
      toast.error("Failed to load listings");
      setListings([]); // Ensure it's always an array
    } finally {
      setLoading(false);
    }
  };

  // Define filterListings before useEffect that uses it
  const filterListings = useCallback(() => {
    // Guard against non-array listings
    if (!Array.isArray(listings)) {
      console.warn("[Marketplace] listings is not an array:", listings);
      setFilteredListings([]);
      return;
    }

    let filtered = [...listings];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((listing) => {
        // Handle location object structure
        const locationMatch =
          listing.location?.country?.toLowerCase().includes(query) ||
          listing.location?.state?.toLowerCase().includes(query) ||
          listing.location?.city?.toLowerCase().includes(query);

        const sellerMatch = listing.seller?.username
          ?.toLowerCase()
          .includes(query);
        const titleMatch = listing.title?.toLowerCase().includes(query);

        return locationMatch || sellerMatch || titleMatch;
      });
    }

    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter(
        (listing) => listing.listingType === filterType
      );
    }

    // Only show active listings
    filtered = filtered.filter((listing) => listing.status === "active");

    // NOTE: We show ALL active listings including user's own
    // The "Buy Now" button will be hidden for seller's own listings

    console.log("[Marketplace] Filtered listings count:", filtered.length);
    console.log("[Marketplace] Current wallet:", wallet?.address);
    setFilteredListings(filtered);
  }, [listings, searchQuery, filterType, wallet?.address]);

  // Load listings on mount
  useEffect(() => {
    loadListings();
    const tab = searchParams.get("tab");
    if (tab === "sell") {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  // Filter listings when dependencies change
  useEffect(() => {
    filterListings();
  }, [filterListings]);

  const handleCreateListing = async () => {
    try {
      const { energyAmount, pricePerUnit, location } = createForm;

      if (!energyAmount || !pricePerUnit || !location) {
        toast.error("Please fill all fields");
        return;
      }

      setCreating(true);
      const loadingToast = toast.loading("Creating listing...");

      // First, approve tokens for marketplace
      toast.loading("Approving tokens...", { id: loadingToast });
      await approveTokens(energyAmount);

      // Create on blockchain (only amount and price are stored on-chain)
      toast.loading("Waiting for blockchain confirmation...", {
        id: loadingToast,
      });
      const blockchainResult = await createListingBlockchain(
        energyAmount,
        pricePerUnit
      );

      // Create in database (store additional metadata here)
      toast.loading("Saving listing...", { id: loadingToast });

      const listingData = {
        amountInTokens: parseFloat(energyAmount),
        pricePerTokenInETH: parseFloat(pricePerUnit),
        title: `${energyAmount} ENGC at ${pricePerUnit} ETH/token`,
        description: `Energy listing in ${location}`,
        energySource: "other", // Valid enum value - can be: solar, wind, hydro, geothermal, biomass, mixed, other
        location: {
          country: location, // For now, use input as country. Can be enhanced with detailed location picker
        },
        listingId: blockchainResult.listingId, // Blockchain listing ID
        transactionHash: blockchainResult.txHash, // Blockchain transaction hash
        // blockNumber will be fetched by backend from transaction receipt
      };

      console.log(
        "[Marketplace] Creating listing in database with data:",
        listingData
      );

      try {
        await createListingAPI(listingData);
        toast.success("Listing created successfully!", { id: loadingToast });
        setShowCreateModal(false);
        setCreateForm({
          energyAmount: "",
          pricePerUnit: "",
          location: "",
          listingType: "sell",
          expiryDays: "7",
        });
        await loadListings();
      } catch (apiError) {
        console.error("[Marketplace] Database save error:", apiError);
        console.error("[Marketplace] Error response:", apiError.response?.data);
        toast.error(
          apiError.response?.data?.message ||
            "Listing created on blockchain but failed to save to database. Please refresh the page.",
          { id: loadingToast }
        );
      }
    } catch (error) {
      console.error("[Marketplace] Error creating listing:", error);
      toast.error(error.message || "Failed to create listing");
    } finally {
      setCreating(false);
    }
  };

  const handleBuyListing = async (listing) => {
    try {
      console.log("[Marketplace] Starting purchase for listing:", listing);
      const loadingToast = toast.loading("Preparing purchase...");

      // Calculate total cost in ETH (already in ETH, stored as totalPriceInETH in DB)
      const totalPriceInETH =
        listing.totalPriceInETH || listing.energyAmount * listing.pricePerUnit;

      console.log("[Marketplace] Total price in ETH:", totalPriceInETH);
      console.log("[Marketplace] User ETH balance:", wallet.ethBalance);
      console.log("[Marketplace] Listing ID:", listing.listingId);

      // Check if user has enough ETH (including gas)
      const estimatedGas = 0.001; // Estimate ~0.001 ETH for gas
      const totalNeeded = totalPriceInETH + estimatedGas;
      const userEthBalance = parseFloat(wallet.ethBalance);

      if (userEthBalance < totalNeeded) {
        toast.error(
          `Insufficient ETH. Need ${totalNeeded.toFixed(
            4
          )} ETH (${totalPriceInETH} + gas), but you have ${userEthBalance.toFixed(
            4
          )} ETH`,
          { id: loadingToast, duration: 5000 }
        );
        return;
      }

      // Buy on blockchain - buyer pays ETH, receives tokens
      // The contract will transfer tokens FROM seller TO buyer
      toast.loading("Sending transaction...", { id: loadingToast });
      const txHash = await buyListing(listing.listingId, totalPriceInETH);

      console.log("[Marketplace] Purchase transaction:", txHash);

      // Update listing status in database
      toast.loading("Updating listing status...", { id: loadingToast });
      try {
        await completePurchase(listing._id, txHash);
        console.log("[Marketplace] Listing marked as sold in database");
      } catch (dbError) {
        console.error("[Marketplace] Failed to update database:", dbError);
        // Still show success since blockchain transaction completed
      }

      toast.success(`Purchase successful! TX: ${txHash.slice(0, 10)}...`, {
        id: loadingToast,
      });

      // Refresh balances
      const ethBalance = await getEthBalance(wallet.address);
      const tokenBalance = await getTokenBalance(wallet.address);
      updateBalances(ethBalance, tokenBalance);

      // Reload listings
      await loadListings();
      setSelectedListing(null);
    } catch (error) {
      console.error("[Marketplace] Error buying listing:", error);

      // Parse error message for better user experience
      let errorMessage = "Failed to purchase listing";
      if (error.code === "INSUFFICIENT_FUNDS") {
        errorMessage =
          "Insufficient ETH balance to complete purchase. Please add more ETH to your wallet.";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage =
          "Insufficient ETH balance. Please add more ETH to cover the listing price and gas fees.";
      } else if (error.message?.includes("user rejected")) {
        errorMessage = "Transaction cancelled by user";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { duration: 5000 });
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
                <FaBolt className="text-xl text-carbon-900" />
              </div>
              <span className="text-xl font-bold gradient-text">
                Marketplace
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">
              Energy Marketplace
            </h1>
            <p className="text-gray-400">Buy and sell energy credits</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="neon-button mt-4 md:mt-0"
          >
            <FaPlus className="inline mr-2" />
            Create Listing
          </motion.button>
        </div>

        {/* Filters */}
        <div className="glass-card mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by location or seller..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="neon-input pl-10"
              />
            </div>
            <div className="flex gap-2">
              {["all", "buy", "sell"].map((type) => (
                <motion.button
                  key={type}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilterType(type)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    filterType === type
                      ? "bg-gradient-to-r from-neon-green to-neon-cyan text-carbon-900"
                      : "glass hover:border-neon-green"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="neon-spinner" />
          </div>
        ) : filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing, index) => (
              <motion.div
                key={listing._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="hover-card"
                onClick={() => setSelectedListing(listing)}
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`neon-badge ${
                          listing.listingType === "sell"
                            ? "bg-neon-green/20"
                            : "bg-neon-cyan/20"
                        }`}
                      >
                        {listing.listingType.toUpperCase()}
                      </span>
                      {listing.seller?.walletAddress?.toLowerCase() ===
                        wallet.address?.toLowerCase() && (
                        <span className="neon-badge bg-yellow-500/20 text-yellow-400 text-xs">
                          YOUR LISTING
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-400">
                      {formatRelativeTime(listing.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <FaWallet className="text-neon-green" />
                    <span>{formatAddress(listing.seller?.walletAddress)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">
                      Energy Amount
                    </div>
                    <div className="text-2xl font-bold text-neon-green flex items-center gap-2">
                      <FaBolt />
                      {formatNumber(listing.energyAmount)} kWh
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-1">
                      Price per Unit
                    </div>
                    <div className="text-xl font-semibold text-neon-cyan">
                      {formatTokenAmount(listing.pricePerUnit, 4)} ENGC
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-1">Location</div>
                    <div className="text-white">
                      {listing.location?.city && listing.location?.state
                        ? `${listing.location.city}, ${
                            listing.location.state
                          }, ${listing.location.country || ""}`
                        : listing.location?.country || "N/A"}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-carbon-600">
                    <div className="text-sm text-gray-400 mb-1">
                      Total Price
                    </div>
                    <div className="text-2xl font-bold gradient-text">
                      {formatNumber(
                        listing.energyAmount * listing.pricePerUnit
                      )}{" "}
                      ENGC
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedListing(listing);
                  }}
                  className="w-full mt-4 neon-button"
                >
                  <FaShoppingCart className="inline mr-2" />
                  View Details
                </motion.button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass-card text-center py-20">
            <FaShoppingCart className="text-6xl text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No listings found</h3>
            <p className="text-gray-400 mb-6">
              Be the first to create a listing!
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="neon-button"
            >
              <FaPlus className="inline mr-2" />
              Create Listing
            </motion.button>
          </div>
        )}
      </div>

      {/* Create Listing Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold gradient-text">
                  Create Listing
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Listing Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["sell", "buy"].map((type) => (
                      <button
                        key={type}
                        onClick={() =>
                          setCreateForm({ ...createForm, listingType: type })
                        }
                        className={`py-3 rounded-lg font-medium transition-all ${
                          createForm.listingType === type
                            ? "bg-gradient-to-r from-neon-green to-neon-cyan text-carbon-900"
                            : "glass hover:border-neon-green"
                        }`}
                      >
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Energy Amount (kWh)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 100"
                    value={createForm.energyAmount}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        energyAmount: e.target.value,
                      })
                    }
                    className="neon-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Price per Unit (ENGC)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="e.g., 0.5"
                    value={createForm.pricePerUnit}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        pricePerUnit: e.target.value,
                      })
                    }
                    className="neon-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., New York, USA"
                    value={createForm.location}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, location: e.target.value })
                    }
                    className="neon-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Expiry (Days)
                  </label>
                  <select
                    value={createForm.expiryDays}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        expiryDays: e.target.value,
                      })
                    }
                    className="neon-input"
                  >
                    <option value="1">1 Day</option>
                    <option value="7">7 Days</option>
                    <option value="14">14 Days</option>
                    <option value="30">30 Days</option>
                  </select>
                </div>

                {createForm.energyAmount && createForm.pricePerUnit && (
                  <div className="p-4 glass rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">
                      Total Value
                    </div>
                    <div className="text-2xl font-bold gradient-text">
                      {formatNumber(
                        parseFloat(createForm.energyAmount) *
                          parseFloat(createForm.pricePerUnit)
                      )}{" "}
                      ENGC
                    </div>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: creating ? 1 : 1.02 }}
                  whileTap={{ scale: creating ? 1 : 0.98 }}
                  onClick={handleCreateListing}
                  disabled={creating}
                  className={`w-full neon-button ${
                    creating ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {creating ? (
                    <>
                      <div className="inline-block w-4 h-4 border-2 border-carbon-900 border-t-transparent rounded-full animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create Listing"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listing Details Modal */}
      <AnimatePresence>
        {selectedListing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setSelectedListing(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold gradient-text">
                  Listing Details
                </h2>
                <button
                  onClick={() => setSelectedListing(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">
                      Energy Amount
                    </div>
                    <div className="text-xl font-bold text-neon-green">
                      {formatNumber(selectedListing.energyAmount)} kWh
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">
                      Price per Unit
                    </div>
                    <div className="text-xl font-bold text-neon-cyan">
                      {formatTokenAmount(selectedListing.pricePerUnit, 4)} ENGC
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-1">Location</div>
                  <div className="text-white">
                    {selectedListing.location?.city &&
                    selectedListing.location?.state
                      ? `${selectedListing.location.city}, ${
                          selectedListing.location.state
                        }, ${selectedListing.location.country || ""}`
                      : selectedListing.location?.country || "N/A"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-1">Seller</div>
                  <div className="font-mono text-neon-green">
                    {formatAddress(selectedListing.seller?.walletAddress)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-1">Listed</div>
                  <div className="text-white">
                    {formatRelativeTime(selectedListing.createdAt)}
                  </div>
                </div>

                <div className="p-6 glass rounded-lg">
                  <div className="text-sm text-gray-400 mb-2">Total Price</div>
                  <div className="text-3xl font-bold gradient-text">
                    {formatNumber(
                      selectedListing.energyAmount *
                        selectedListing.pricePerUnit
                    )}{" "}
                    ENGC
                  </div>
                </div>

                {selectedListing.seller?.walletAddress?.toLowerCase() !==
                  wallet.address?.toLowerCase() && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleBuyListing(selectedListing)}
                    className="w-full neon-button"
                  >
                    <FaShoppingCart className="inline mr-2" />
                    Buy Now
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketplacePage;
