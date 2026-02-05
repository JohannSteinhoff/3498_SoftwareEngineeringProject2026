// Tender API Server
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, UserDB, RecipeDB, GroceryDB, MealPlanDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files

// Simple session store (in production, use Redis or database sessions)
const sessions = new Map();

// Generate session token
function generateToken() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

// Auth middleware
function authenticate(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || !sessions.has(token)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    req.userId = sessions.get(token);
    next();
}

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', (req, res) => {
    try {
        const user = UserDB.create(req.body);

        if (!user) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create session
        const token = generateToken();
        sessions.set(token, user.id);

        res.status(201).json({ user, token });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        const user = UserDB.authenticate(email, password);

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Create session
        const token = generateToken();
        sessions.set(token, user.id);

        res.json({ user, token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
        sessions.delete(token);
    }
    res.json({ success: true });
});

// Get current user
app.get('/api/auth/me', authenticate, (req, res) => {
    try {
        const user = UserDB.getById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== USER ROUTES ====================

// Update user profile
app.put('/api/users/profile', authenticate, (req, res) => {
    try {
        const user = UserDB.update(req.userId, req.body);
        res.json(user);
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete account
app.delete('/api/users/account', authenticate, (req, res) => {
    try {
        UserDB.delete(req.userId);

        // Remove session
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) sessions.delete(token);

        res.json({ success: true });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== RECIPE ROUTES ====================

// Get all recipes
app.get('/api/recipes', (req, res) => {
    try {
        const recipes = RecipeDB.getAll();
        res.json(recipes);
    } catch (err) {
        console.error('Get recipes error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get recipes for swiping (excludes already swiped)
app.get('/api/recipes/discover', authenticate, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const recipes = RecipeDB.getForUser(req.userId, limit);
        res.json(recipes);
    } catch (err) {
        console.error('Get discover recipes error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single recipe
app.get('/api/recipes/:id', (req, res) => {
    try {
        const recipe = RecipeDB.getById(parseInt(req.params.id));
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        res.json(recipe);
    } catch (err) {
        console.error('Get recipe error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get liked recipes
app.get('/api/recipes/user/liked', authenticate, (req, res) => {
    try {
        const recipes = RecipeDB.getLiked(req.userId);
        res.json(recipes);
    } catch (err) {
        console.error('Get liked recipes error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Like a recipe
app.post('/api/recipes/:id/like', authenticate, (req, res) => {
    try {
        RecipeDB.like(req.userId, parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        console.error('Like recipe error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Dislike a recipe
app.post('/api/recipes/:id/dislike', authenticate, (req, res) => {
    try {
        RecipeDB.dislike(req.userId, parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        console.error('Dislike recipe error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Unlike a recipe
app.delete('/api/recipes/:id/like', authenticate, (req, res) => {
    try {
        RecipeDB.unlike(req.userId, parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        console.error('Unlike recipe error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== GROCERY ROUTES ====================

// Get grocery list
app.get('/api/grocery', authenticate, (req, res) => {
    try {
        const items = GroceryDB.getAll(req.userId);
        res.json(items);
    } catch (err) {
        console.error('Get grocery error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add grocery item
app.post('/api/grocery', authenticate, (req, res) => {
    try {
        const item = GroceryDB.add(req.userId, req.body);
        res.status(201).json(item);
    } catch (err) {
        console.error('Add grocery error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update grocery item
app.put('/api/grocery/:id', authenticate, (req, res) => {
    try {
        const item = GroceryDB.update(parseInt(req.params.id), req.body);
        res.json(item);
    } catch (err) {
        console.error('Update grocery error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toggle grocery item
app.post('/api/grocery/:id/toggle', authenticate, (req, res) => {
    try {
        const item = GroceryDB.toggle(parseInt(req.params.id));
        res.json(item);
    } catch (err) {
        console.error('Toggle grocery error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete grocery item
app.delete('/api/grocery/:id', authenticate, (req, res) => {
    try {
        GroceryDB.delete(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        console.error('Delete grocery error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Clear grocery list
app.delete('/api/grocery', authenticate, (req, res) => {
    try {
        GroceryDB.clearAll(req.userId);
        res.json({ success: true });
    } catch (err) {
        console.error('Clear grocery error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== MEAL PLAN ROUTES ====================

// Get meal plan
app.get('/api/mealplan', authenticate, (req, res) => {
    try {
        const mealPlan = MealPlanDB.getAll(req.userId);
        res.json(mealPlan);
    } catch (err) {
        console.error('Get meal plan error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add to meal plan
app.post('/api/mealplan', authenticate, (req, res) => {
    try {
        const { recipeId, date, mealType } = req.body;
        MealPlanDB.add(req.userId, recipeId, date, mealType);
        res.json({ success: true });
    } catch (err) {
        console.error('Add meal plan error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Remove from meal plan
app.delete('/api/mealplan/:date/:mealType', authenticate, (req, res) => {
    try {
        MealPlanDB.remove(req.userId, req.params.date, req.params.mealType);
        res.json({ success: true });
    } catch (err) {
        console.error('Remove meal plan error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== STATS ROUTE ====================

app.get('/api/stats', authenticate, (req, res) => {
    try {
        const user = UserDB.getById(req.userId);
        const likedRecipes = RecipeDB.getLiked(req.userId);
        const groceryItems = GroceryDB.getAll(req.userId);
        const mealPlan = MealPlanDB.getAll(req.userId);

        // Calculate days as member
        const createdAt = new Date(user.createdAt);
        const now = new Date();
        const memberDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)) + 1;

        res.json({
            likedCount: likedRecipes.length,
            groceryCount: groceryItems.length,
            mealPlanCount: mealPlan.length,
            memberDays
        });
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== SERVE FRONTEND ====================

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'tender.html'));
});

// Start server after database initialization
async function startServer() {
    await initDatabase();

    app.listen(PORT, () => {
        console.log(`
    ╔════════════════════════════════════════╗
    ║                                        ║
    ║   🍳 Tender Server Running!            ║
    ║                                        ║
    ║   Local: http://localhost:${PORT}         ║
    ║                                        ║
    ║   API Endpoints:                       ║
    ║   - POST /api/auth/register            ║
    ║   - POST /api/auth/login               ║
    ║   - GET  /api/recipes                  ║
    ║   - GET  /api/grocery                  ║
    ║                                        ║
    ╚════════════════════════════════════════╝
        `);
    });
}

startServer().catch(console.error);
