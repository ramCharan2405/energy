import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
    persist(
        (set, get) => ({
            // ============ USER STATE ============
            user: null,
            token: null,
            isAuthenticated: false,

            setUser: (user) => set({ user, isAuthenticated: !!user }),
            setToken: (token) => set({ token }),
            clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),

            updateUserBalance: (balance) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...balance } : null,
                })),

            // ============ WALLET STATE ============
            wallet: {
                address: null,
                chainId: null,
                ethBalance: '0',
                tokenBalance: '0',
                isConnected: false,
            },

            setWallet: (wallet) => {
                const currentWallet = get().wallet;
                const newWallet = {
                    ...currentWallet,
                    ...wallet,
                    isConnected: !!wallet.address,
                };
                console.log('[Store] setWallet called with:', wallet);
                console.log('[Store] New wallet state:', newWallet);
                set({ wallet: newWallet });
            },

            updateBalances: (ethBalance, tokenBalance) => {
                const updatedWallet = {
                    ...get().wallet,
                    ethBalance: ethBalance !== undefined && ethBalance !== null ? ethBalance : get().wallet.ethBalance,
                    tokenBalance: tokenBalance !== undefined && tokenBalance !== null ? tokenBalance : get().wallet.tokenBalance,
                };
                console.log('[Store] updateBalances called with ETH:', ethBalance, 'ENGC:', tokenBalance);
                console.log('[Store] Updated wallet:', updatedWallet);
                set({ wallet: updatedWallet });
            },

            disconnectWallet: () =>
                set({
                    wallet: {
                        address: null,
                        chainId: null,
                        ethBalance: '0',
                        tokenBalance: '0',
                        isConnected: false,
                    },
                }),

            // ============ LISTINGS STATE ============
            listings: [],
            myListings: [],
            selectedListing: null,
            listingsLoading: false,

            setListings: (listings) => set({ listings }),
            setMyListings: (myListings) => set({ myListings }),
            setSelectedListing: (listing) => set({ selectedListing: listing }),
            setListingsLoading: (loading) => set({ listingsLoading: loading }),

            addListing: (listing) =>
                set((state) => ({
                    listings: [listing, ...state.listings],
                    myListings: [listing, ...state.myListings],
                })),

            updateListing: (id, updates) =>
                set((state) => ({
                    listings: state.listings.map((l) =>
                        l._id === id ? { ...l, ...updates } : l
                    ),
                    myListings: state.myListings.map((l) =>
                        l._id === id ? { ...l, ...updates } : l
                    ),
                })),

            removeListing: (id) =>
                set((state) => ({
                    listings: state.listings.filter((l) => l._id !== id),
                    myListings: state.myListings.filter((l) => l._id !== id),
                })),

            // ============ TRANSACTIONS STATE ============
            transactions: [],
            recentTransactions: [],
            transactionsLoading: false,

            setTransactions: (transactions) => set({ transactions }),
            setRecentTransactions: (transactions) =>
                set({ recentTransactions: transactions }),
            setTransactionsLoading: (loading) => set({ transactionsLoading: loading }),

            addTransaction: (transaction) =>
                set((state) => ({
                    transactions: [transaction, ...state.transactions],
                    recentTransactions: [transaction, ...state.recentTransactions].slice(0, 10),
                })),

            // ============ ANALYTICS STATE ============
            marketStats: null,
            priceHistory: [],
            tradingVolume: null,
            userAnalytics: null,

            setMarketStats: (stats) => set({ marketStats: stats }),
            setPriceHistory: (history) => set({ priceHistory: history }),
            setTradingVolume: (volume) => set({ tradingVolume: volume }),
            setUserAnalytics: (analytics) => set({ userAnalytics: analytics }),

            // ============ UI STATE ============
            sidebarOpen: true,
            theme: 'dark',
            notifications: [],

            toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            setTheme: (theme) => set({ theme }),

            addNotification: (notification) =>
                set((state) => ({
                    notifications: [
                        ...state.notifications,
                        { ...notification, id: Date.now(), timestamp: new Date() },
                    ],
                })),

            removeNotification: (id) =>
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id),
                })),

            clearNotifications: () => set({ notifications: [] }),

            // ============ FILTERS & SEARCH STATE ============
            searchQuery: '',
            filters: {
                type: 'all', // 'all', 'buy', 'sell'
                minPrice: null,
                maxPrice: null,
                minAmount: null,
                maxAmount: null,
                location: null,
                sortBy: 'createdAt',
                sortOrder: 'desc',
            },

            setSearchQuery: (query) => set({ searchQuery: query }),
            setFilters: (filters) =>
                set((state) => ({ filters: { ...state.filters, ...filters } })),
            resetFilters: () =>
                set({
                    searchQuery: '',
                    filters: {
                        type: 'all',
                        minPrice: null,
                        maxPrice: null,
                        minAmount: null,
                        maxAmount: null,
                        location: null,
                        sortBy: 'createdAt',
                        sortOrder: 'desc',
                    },
                }),

            // ============ LOADING STATES ============
            loading: {
                user: false,
                listings: false,
                transactions: false,
                wallet: false,
            },

            setLoading: (key, value) =>
                set((state) => ({
                    loading: { ...state.loading, [key]: value },
                })),

            // ============ RESET STATE ============
            reset: () =>
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    wallet: {
                        address: null,
                        chainId: null,
                        ethBalance: '0',
                        tokenBalance: '0',
                        isConnected: false,
                    },
                    listings: [],
                    myListings: [],
                    selectedListing: null,
                    transactions: [],
                    recentTransactions: [],
                    marketStats: null,
                    priceHistory: [],
                    tradingVolume: null,
                    userAnalytics: null,
                    notifications: [],
                    searchQuery: '',
                    filters: {
                        type: 'all',
                        minPrice: null,
                        maxPrice: null,
                        minAmount: null,
                        maxAmount: null,
                        location: null,
                        sortBy: 'createdAt',
                        sortOrder: 'desc',
                    },
                }),
        }),
        {
            name: 'energy-trading-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
                wallet: state.wallet, // Persist wallet state
                theme: state.theme,
                sidebarOpen: state.sidebarOpen,
            }),
        }
    )
);

export default useStore;
