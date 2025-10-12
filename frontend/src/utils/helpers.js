import { format, formatDistance, formatDistanceToNow } from 'date-fns';

// ============ FORMATTING UTILITIES ============

export const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatNumber = (number, decimals = 2) => {
    if (!number) return '0';
    const num = typeof number === 'string' ? parseFloat(number) : number;
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
};

export const formatCurrency = (amount, currency = 'USD') => {
    if (!amount) return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(num);
};

export const formatTokenAmount = (amount, decimals = 4) => {
    if (!amount || amount === '0' || amount === 0) return '0';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0';
    if (num < 0.0001 && num > 0) return '< 0.0001';
    return formatNumber(num, decimals);
};

export const formatDate = (date, formatStr = 'PPpp') => {
    if (!date) return '';
    return format(new Date(date), formatStr);
};

export const formatRelativeTime = (date) => {
    if (!date) return '';
    return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatDuration = (start, end) => {
    if (!start || !end) return '';
    return formatDistance(new Date(start), new Date(end));
};

// ============ VALIDATION UTILITIES ============

export const isValidAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const isValidNumber = (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value);
};

export const isPositiveNumber = (value) => {
    return isValidNumber(value) && parseFloat(value) > 0;
};

export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// ============ CONVERSION UTILITIES ============

export const weiToEth = (wei) => {
    if (!wei) return '0';
    return (parseFloat(wei) / 1e18).toString();
};

export const ethToWei = (eth) => {
    if (!eth) return '0';
    return (parseFloat(eth) * 1e18).toString();
};

export const calculateTotalCost = (amount, pricePerUnit) => {
    return parseFloat(amount) * parseFloat(pricePerUnit);
};

export const calculatePlatformFee = (amount, feePercentage = 2.5) => {
    return (parseFloat(amount) * feePercentage) / 100;
};

// ============ DATA TRANSFORMATION UTILITIES ============

export const sortByDate = (array, key = 'createdAt', order = 'desc') => {
    return [...array].sort((a, b) => {
        const dateA = new Date(a[key]);
        const dateB = new Date(b[key]);
        return order === 'desc' ? dateB - dateA : dateA - dateB;
    });
};

export const sortByNumber = (array, key, order = 'desc') => {
    return [...array].sort((a, b) => {
        const numA = parseFloat(a[key]);
        const numB = parseFloat(b[key]);
        return order === 'desc' ? numB - numA : numA - numB;
    });
};

export const filterByStatus = (array, status) => {
    return array.filter((item) => item.status === status);
};

export const filterByDateRange = (array, startDate, endDate, key = 'createdAt') => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return array.filter((item) => {
        const date = new Date(item[key]);
        return date >= start && date <= end;
    });
};

export const groupByKey = (array, key) => {
    return array.reduce((acc, item) => {
        const group = item[key];
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(item);
        return acc;
    }, {});
};

// ============ UI UTILITIES ============

export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy:', error);
        return false;
    }
};

export const downloadJSON = (data, filename = 'data.json') => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

export const downloadCSV = (data, filename = 'data.csv') => {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map((row) =>
            headers.map((header) => JSON.stringify(row[header] || '')).join(',')
        ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export const throttle = (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

// ============ ERROR HANDLING UTILITIES ============

export const handleError = (error) => {
    if (error.response) {
        // Server responded with error
        return error.response.data.error || error.response.data.message || 'Server error';
    } else if (error.request) {
        // Request made but no response
        return 'No response from server';
    } else if (error.message) {
        // Error in request setup or blockchain
        return error.message;
    }
    return 'An unexpected error occurred';
};

export const parseError = (error) => {
    // Parse blockchain errors
    if (error.code) {
        switch (error.code) {
            case 4001:
                return 'Transaction rejected by user';
            case -32603:
                return 'Internal JSON-RPC error';
            case -32002:
                return 'Request already pending';
            default:
                return error.message || 'Transaction failed';
        }
    }
    return handleError(error);
};

// ============ STATUS UTILITIES ============

export const getStatusColor = (status) => {
    const colors = {
        active: 'text-neon-green',
        pending: 'text-yellow-400',
        completed: 'text-neon-cyan',
        cancelled: 'text-red-400',
        expired: 'text-gray-400',
    };
    return colors[status?.toLowerCase()] || 'text-gray-400';
};

export const getStatusBadge = (status) => {
    const badges = {
        active: 'bg-neon-green/20 text-neon-green border-neon-green/50',
        pending: 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50',
        completed: 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50',
        cancelled: 'bg-red-400/20 text-red-400 border-red-400/50',
        expired: 'bg-gray-400/20 text-gray-400 border-gray-400/50',
    };
    return badges[status?.toLowerCase()] || badges.expired;
};

export const getListingTypeLabel = (type) => {
    const labels = {
        0: 'Buy',
        1: 'Sell',
        buy: 'Buy',
        sell: 'Sell',
    };
    return labels[type] || 'Unknown';
};

// ============ LOCAL STORAGE UTILITIES ============

export const storage = {
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },

    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch {
            return false;
        }
    },

    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch {
            return false;
        }
    },
};

export default {
    formatAddress,
    formatNumber,
    formatCurrency,
    formatTokenAmount,
    formatDate,
    formatRelativeTime,
    formatDuration,
    isValidAddress,
    isValidNumber,
    isPositiveNumber,
    validateEmail,
    weiToEth,
    ethToWei,
    calculateTotalCost,
    calculatePlatformFee,
    sortByDate,
    sortByNumber,
    filterByStatus,
    filterByDateRange,
    groupByKey,
    copyToClipboard,
    downloadJSON,
    downloadCSV,
    debounce,
    throttle,
    handleError,
    parseError,
    getStatusColor,
    getStatusBadge,
    getListingTypeLabel,
    storage,
};
