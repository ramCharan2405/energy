/**
 * Success Response Helper
 * Returns a formatted success response object
 */
const successResponse = (message, data = null) => {
    const response = {
        success: true,
        message,
    };

    if (data !== null) {
        response.data = data;
    }

    return response;
};

/**
 * Error Response Helper
 * Returns a formatted error response object
 */
const errorResponse = (message, errors = null) => {
    const response = {
        success: false,
        message,
    };

    if (errors) {
        response.errors = errors;
    }

    return response;
};

/**
 * Pagination Helper
 */
const paginate = (page = 1, limit = 20) => {
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, parseInt(process.env.MAX_PAGE_SIZE) || 100);
    const skip = (pageNum - 1) * limitNum;

    return {
        page: pageNum,
        limit: limitNum,
        skip,
    };
};

/**
 * Build pagination response
 */
const paginationResponse = (data, total, page, limit) => {
    const totalPages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
};

/**
 * Async handler to wrap async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Generate random string
 */
const generateRandomString = (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Calculate percentage
 */
const calculatePercentage = (value, total) => {
    if (total === 0) return 0;
    return ((value / total) * 100).toFixed(2);
};

/**
 * Format number with decimals
 */
const formatNumber = (number, decimals = 2) => {
    return parseFloat(number).toFixed(decimals);
};

/**
 * Convert wei to ether (for display)
 */
const weiToEther = (wei) => {
    return (wei / 1e18).toFixed(6);
};

/**
 * Convert ether to wei
 */
const etherToWei = (ether) => {
    return Math.floor(ether * 1e18);
};

/**
 * Validate Ethereum address format
 */
const isValidEthAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Sanitize user input
 */
const sanitizeInput = (input) => {
    if (typeof input === 'string') {
        return input.trim().replace(/[<>]/g, '');
    }
    return input;
};

/**
 * Calculate time difference in human readable format
 */
const getTimeDifference = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
};

/**
 * Generate slug from string
 */
const generateSlug = (str) => {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

/**
 * Deep clone object
 */
const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Group array by key
 */
const groupBy = (array, key) => {
    return array.reduce((result, item) => {
        const group = item[key];
        if (!result[group]) {
            result[group] = [];
        }
        result[group].push(item);
        return result;
    }, {});
};

/**
 * Calculate average
 */
const calculateAverage = (numbers) => {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
};

/**
 * Shuffle array
 */
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

/**
 * Remove duplicates from array
 */
const removeDuplicates = (array) => {
    return [...new Set(array)];
};

/**
 * Check if object is empty
 */
const isEmpty = (obj) => {
    return Object.keys(obj).length === 0;
};

/**
 * Delay function (for rate limiting, retries, etc.)
 */
const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

module.exports = {
    successResponse,
    errorResponse,
    paginate,
    paginationResponse,
    asyncHandler,
    generateRandomString,
    calculatePercentage,
    formatNumber,
    weiToEther,
    etherToWei,
    isValidEthAddress,
    sanitizeInput,
    getTimeDifference,
    generateSlug,
    deepClone,
    groupBy,
    calculateAverage,
    shuffleArray,
    removeDuplicates,
    isEmpty,
    delay,
};
