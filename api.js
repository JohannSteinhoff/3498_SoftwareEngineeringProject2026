// Tender API Client
// Handles all communication with the backend server

const API_URL = 'http://localhost:3000/api';

const TenderAPI = {
    // Store token in localStorage
    getToken() {
        return localStorage.getItem('tender_token');
    },

    setToken(token) {
        localStorage.setItem('tender_token', token);
    },

    clearToken() {
        localStorage.removeItem('tender_token');
    },

    // Make API request
    async request(endpoint, options = {}) {
        const token = this.getToken();

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        if (options.body) {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    },

    // ==================== AUTH ====================

    async register(userData) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: userData,
        });
        this.setToken(data.token);
        return data.user;
    },

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: { email, password },
        });
        this.setToken(data.token);
        return data.user;
    },

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (err) {
            // Ignore errors on logout
        }
        this.clearToken();
    },

    async getCurrentUser() {
        const data = await this.request('/auth/me');
        // Handle both { user: {...} } and direct {...} response formats
        return data.user || data;
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    // ==================== USER ====================

    async updateProfile(data) {
        return this.request('/users/profile', {
            method: 'PUT',
            body: data,
        });
    },

    async deleteAccount() {
        await this.request('/users/account', { method: 'DELETE' });
        this.clearToken();
    },

    // ==================== RECIPES ====================

    async createRecipe(data) {
        return this.request('/recipes', {
            method: 'POST',
            body: data,
        });
    },

    async getRecipes() {
        return this.request('/recipes');
    },

    async getDiscoverRecipes(limit = 10) {
        return this.request(`/recipes/discover?limit=${limit}`);
    },

    async getRecipe(id) {
        return this.request(`/recipes/${id}`);
    },

    async getLikedRecipes() {
        return this.request('/recipes/user/liked');
    },

    async likeRecipe(id) {
        return this.request(`/recipes/${id}/like`, { method: 'POST' });
    },

    async dislikeRecipe(id) {
        return this.request(`/recipes/${id}/dislike`, { method: 'POST' });
    },

    async unlikeRecipe(id) {
        return this.request(`/recipes/${id}/like`, { method: 'DELETE' });
    },

    async getMyRecipes() {
        return this.request('/recipes/user/created');
    },

    async deleteRecipe(id) {
        return this.request(`/recipes/${id}`, { method: 'DELETE' });
    },

    // ==================== GROCERY ====================

    async getGroceryList() {
        return this.request('/grocery');
    },

    async addGroceryItem(item) {
        return this.request('/grocery', {
            method: 'POST',
            body: item,
        });
    },

    async updateGroceryItem(id, data) {
        return this.request(`/grocery/${id}`, {
            method: 'PUT',
            body: data,
        });
    },

    async toggleGroceryItem(id) {
        return this.request(`/grocery/${id}/toggle`, { method: 'POST' });
    },

    async deleteGroceryItem(id) {
        return this.request(`/grocery/${id}`, { method: 'DELETE' });
    },

    async clearGroceryList() {
        return this.request('/grocery', { method: 'DELETE' });
    },

    // ==================== MEAL PLAN ====================

    async getMealPlan() {
        return this.request('/mealplan');
    },

    async addToMealPlan(recipeId, date, mealType) {
        return this.request('/mealplan', {
            method: 'POST',
            body: { recipeId, date, mealType },
        });
    },

    async removeFromMealPlan(date, mealType) {
        return this.request(`/mealplan/${date}/${mealType}`, { method: 'DELETE' });
    },

    // ==================== STATS ====================

    async getStats() {
        return this.request('/stats');
    },
};

// For backwards compatibility, also provide a TenderDB-like interface
const TenderDB = {
    isLoggedIn() {
        return TenderAPI.isLoggedIn();
    },

    getCurrentUser() {
        // This is now async, but for backwards compatibility we return cached data
        const cached = localStorage.getItem('tender_user_cache');
        return cached ? JSON.parse(cached) : null;
    },

    setCurrentUser(user) {
        localStorage.setItem('tender_user_cache', JSON.stringify(user));
    },

    logout() {
        TenderAPI.logout();
        localStorage.removeItem('tender_user_cache');
    },

    getUserByEmail(email) {
        // This check is now done server-side during registration
        return null;
    },

    async createUser(data) {
        const user = await TenderAPI.register(data);
        this.setCurrentUser(user);
        return user;
    },

    async authenticate(email, password) {
        try {
            const user = await TenderAPI.login(email, password);
            this.setCurrentUser(user);
            return user;
        } catch (err) {
            return null;
        }
    },

    async addToGroceryList(userId, item) {
        return TenderAPI.addGroceryItem(item);
    },

    async toggleGroceryItem(userId, itemId) {
        return TenderAPI.toggleGroceryItem(itemId);
    },

    async removeFromGroceryList(userId, itemId) {
        return TenderAPI.deleteGroceryItem(itemId);
    },

    async clearGroceryList(userId) {
        return TenderAPI.clearGroceryList();
    }
};
