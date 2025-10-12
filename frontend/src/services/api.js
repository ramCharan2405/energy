import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// ============ AUTH ENDPOINTS ============

export const getNonce = async (walletAddress) => {
    const response = await api.get(`/auth/nonce/${walletAddress}`);
    return response.data;
};

export const login = async (walletAddress, signature, message) => {
    const response = await api.post('/auth/login', {
        walletAddress,
        signature,
        message,
    });

    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
};

export const getMe = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};

export const logout = async () => {
    try {
        await api.post('/auth/logout');
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
};

// ============ USER ENDPOINTS ============

export const getProfile = async () => {
    const response = await api.get('/users/profile');
    return response.data;
};

export const updateProfile = async (data) => {
    const response = await api.put('/users/profile', data);
    return response.data;
};

export const getUserStats = async () => {
    const response = await api.get('/users/stats');
    return response.data;
};

export const getUserBalance = async () => {
    const response = await api.get('/users/balance');
    return response.data;
};

export const mintTokens = async (amount) => {
    const response = await api.post('/users/mint', { amount });
    return response.data;
};

export const burnTokens = async (amount) => {
    const response = await api.post('/users/burn', { amount });
    return response.data;
};

// ============ LISTING ENDPOINTS ============

export const getListings = async (params = {}) => {
    const response = await api.get('/listings', { params });
    return response.data;
};

export const getListing = async (id) => {
    const response = await api.get(`/listings/${id}`);
    return response.data;
};

export const createListing = async (data) => {
    const response = await api.post('/listings', data);
    return response.data;
};

export const updateListing = async (id, data) => {
    const response = await api.put(`/listings/${id}`, data);
    return response.data;
};

export const deleteListing = async (id) => {
    const response = await api.delete(`/listings/${id}`);
    return response.data;
};

export const completePurchase = async (listingId, transactionHash) => {
    const response = await api.post(`/listings/${listingId}/purchase`, {
        transactionHash
    });
    return response.data;
};

export const getMyListings = async () => {
    const response = await api.get('/listings/my/all');
    return response.data;
};

export const searchListings = async (query) => {
    const response = await api.get(`/listings/search?q=${query}`);
    return response.data;
};

export const filterListingsByType = async (type) => {
    const response = await api.get(`/listings/type/${type}`);
    return response.data;
};

export const getNearbyListings = async (location, radius) => {
    const response = await api.get(`/listings/nearby/${location}/${radius}`);
    return response.data;
};

// ============ TRANSACTION ENDPOINTS ============

export const getTransactions = async (params = {}) => {
    const response = await api.get('/transactions', { params });
    return response.data;
};

export const getTransaction = async (id) => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
};

export const getMyTransactions = async () => {
    const response = await api.get('/transactions/my/all');
    return response.data;
};

export const getBuyTransactions = async () => {
    const response = await api.get('/transactions/my/purchases');
    return response.data;
};

export const getSellTransactions = async () => {
    const response = await api.get('/transactions/my/sales');
    return response.data;
};

export const getTransactionStats = async () => {
    const response = await api.get('/transactions/stats');
    return response.data;
};

export const getUserTransactionHistory = async () => {
    const response = await api.get('/transactions/history');
    return response.data;
};

// ============ ANALYTICS ENDPOINTS ============

export const getMarketStats = async () => {
    const response = await api.get('/analytics/market-stats');
    return response.data;
};

export const getPriceHistory = async (days = 30) => {
    const response = await api.get(`/analytics/price-history/${days}`);
    return response.data;
};

export const getTradingVolume = async (period = 'week') => {
    const response = await api.get(`/analytics/volume/${period}`);
    return response.data;
};

export const getUserAnalytics = async () => {
    const response = await api.get('/analytics/user');
    return response.data;
};

export const getMarketTrends = async () => {
    const response = await api.get('/analytics/trends');
    return response.data;
};

export const getTopTraders = async (limit = 10) => {
    const response = await api.get(`/analytics/top-traders/${limit}`);
    return response.data;
};

export const getRecentActivity = async (limit = 20) => {
    const response = await api.get(`/analytics/recent-activity/${limit}`);
    return response.data;
};

export default api;
