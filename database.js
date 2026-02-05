// Database module using sql.js (pure JavaScript SQLite)
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'tender.db');

let db = null;

// Initialize database
async function initDatabase() {
    const SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
        console.log('Loaded existing database');
    } else {
        db = new SQL.Database();
        console.log('Created new database');
    }

    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            cooking_skill TEXT DEFAULT 'intermediate',
            household_size TEXT DEFAULT '2',
            weekly_budget TEXT DEFAULT 'moderate',
            meals_per_week TEXT DEFAULT '4-7',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS user_dietary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            dietary TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, dietary)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS user_cuisines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            cuisine TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, cuisine)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            cook_time INTEGER,
            servings INTEGER DEFAULT 4,
            difficulty TEXT DEFAULT 'medium',
            cuisine TEXT,
            emoji TEXT DEFAULT '🍽️',
            ingredients TEXT,
            instructions TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS liked_recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            recipe_id INTEGER NOT NULL,
            liked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
            UNIQUE(user_id, recipe_id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS disliked_recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            recipe_id INTEGER NOT NULL,
            disliked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
            UNIQUE(user_id, recipe_id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS grocery_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            unit TEXT DEFAULT '',
            category TEXT DEFAULT 'Other',
            checked INTEGER DEFAULT 0,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS meal_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            recipe_id INTEGER NOT NULL,
            plan_date DATE NOT NULL,
            meal_type TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
            UNIQUE(user_id, plan_date, meal_type)
        )
    `);

    // Insert sample recipes if table is empty
    const result = db.exec('SELECT COUNT(*) as count FROM recipes');
    const count = result.length > 0 ? result[0].values[0][0] : 0;

    if (count === 0) {
        insertSampleRecipes();
    }

    saveDatabase();
    console.log('Database initialized successfully');
}

// Save database to file
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

// Helper to run queries and get results
function runQuery(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    } catch (err) {
        console.error('Query error:', sql, err);
        return [];
    }
}

// Helper to run insert/update and get last ID
function runInsert(sql, params = []) {
    try {
        db.run(sql, params);
        const result = db.exec('SELECT last_insert_rowid() as id');
        saveDatabase();
        return result[0]?.values[0][0] || null;
    } catch (err) {
        console.error('Insert error:', sql, err);
        return null;
    }
}

// Helper to run update/delete
function runUpdate(sql, params = []) {
    try {
        db.run(sql, params);
        saveDatabase();
        return true;
    } catch (err) {
        console.error('Update error:', sql, err);
        return false;
    }
}

// Insert sample recipes
function insertSampleRecipes() {
    const recipes = [
        { name: 'Pasta Carbonara', description: 'Classic Italian pasta with eggs, cheese, and pancetta', cook_time: 25, servings: 4, difficulty: 'medium', cuisine: 'italian', emoji: '🍝', ingredients: 'spaghetti,eggs,parmesan,pancetta,black pepper', instructions: '1. Cook pasta. 2. Fry pancetta. 3. Mix eggs and cheese. 4. Combine all.' },
        { name: 'Chicken Tacos', description: 'Flavorful Mexican tacos with seasoned chicken', cook_time: 20, servings: 4, difficulty: 'easy', cuisine: 'mexican', emoji: '🌮', ingredients: 'chicken breast,taco shells,lettuce,tomato,cheese,sour cream', instructions: '1. Season and cook chicken. 2. Warm shells. 3. Assemble tacos.' },
        { name: 'Caesar Salad', description: 'Fresh romaine with creamy Caesar dressing', cook_time: 15, servings: 2, difficulty: 'easy', cuisine: 'american', emoji: '🥗', ingredients: 'romaine lettuce,parmesan,croutons,caesar dressing,lemon', instructions: '1. Chop lettuce. 2. Add dressing. 3. Top with croutons and cheese.' },
        { name: 'Beef Stir Fry', description: 'Quick and healthy Asian-inspired dish', cook_time: 30, servings: 4, difficulty: 'medium', cuisine: 'chinese', emoji: '🥘', ingredients: 'beef strips,bell peppers,broccoli,soy sauce,garlic,ginger', instructions: '1. Slice beef and veggies. 2. Stir fry beef. 3. Add veggies and sauce.' },
        { name: 'Margherita Pizza', description: 'Classic Italian pizza with fresh ingredients', cook_time: 45, servings: 4, difficulty: 'medium', cuisine: 'italian', emoji: '🍕', ingredients: 'pizza dough,tomato sauce,mozzarella,fresh basil,olive oil', instructions: '1. Roll dough. 2. Add sauce and cheese. 3. Bake at 450F. 4. Add basil.' },
        { name: 'Sushi Rolls', description: 'Homemade maki rolls with fresh fish', cook_time: 40, servings: 4, difficulty: 'hard', cuisine: 'japanese', emoji: '🍱', ingredients: 'sushi rice,nori,salmon,cucumber,avocado,rice vinegar', instructions: '1. Prepare rice. 2. Lay nori. 3. Add fillings. 4. Roll and slice.' },
        { name: 'Butter Chicken', description: 'Creamy Indian curry with tender chicken', cook_time: 35, servings: 4, difficulty: 'medium', cuisine: 'indian', emoji: '🍛', ingredients: 'chicken thighs,tomatoes,cream,butter,garam masala,garlic', instructions: '1. Marinate chicken. 2. Make sauce. 3. Simmer together. 4. Serve with rice.' },
        { name: 'Greek Gyros', description: 'Mediterranean wrap with tzatziki sauce', cook_time: 25, servings: 4, difficulty: 'medium', cuisine: 'greek', emoji: '🥙', ingredients: 'lamb or chicken,pita bread,tzatziki,tomato,onion,lettuce', instructions: '1. Season and cook meat. 2. Warm pita. 3. Assemble with toppings.' },
        { name: 'Pad Thai', description: 'Classic Thai noodle dish', cook_time: 30, servings: 4, difficulty: 'medium', cuisine: 'thai', emoji: '🍜', ingredients: 'rice noodles,shrimp,eggs,bean sprouts,peanuts,lime', instructions: '1. Soak noodles. 2. Stir fry shrimp and eggs. 3. Add noodles and sauce.' },
        { name: 'French Onion Soup', description: 'Rich soup with melted cheese topping', cook_time: 60, servings: 4, difficulty: 'medium', cuisine: 'french', emoji: '🍲', ingredients: 'onions,beef broth,bread,gruyere cheese,butter,thyme', instructions: '1. Caramelize onions. 2. Add broth. 3. Top with bread and cheese. 4. Broil.' },
        { name: 'Bibimbap', description: 'Korean rice bowl with vegetables and egg', cook_time: 35, servings: 2, difficulty: 'medium', cuisine: 'korean', emoji: '🍚', ingredients: 'rice,beef,spinach,carrots,zucchini,egg,gochujang', instructions: '1. Cook rice. 2. Prepare toppings. 3. Arrange in bowl. 4. Add egg and sauce.' },
        { name: 'Fish and Chips', description: 'British classic with crispy battered fish', cook_time: 40, servings: 4, difficulty: 'medium', cuisine: 'british', emoji: '🐟', ingredients: 'cod fillets,potatoes,flour,beer,tartar sauce', instructions: '1. Make batter. 2. Fry chips. 3. Batter and fry fish. 4. Serve with sauce.' }
    ];

    for (const recipe of recipes) {
        runInsert(
            `INSERT INTO recipes (name, description, cook_time, servings, difficulty, cuisine, emoji, ingredients, instructions)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [recipe.name, recipe.description, recipe.cook_time, recipe.servings, recipe.difficulty, recipe.cuisine, recipe.emoji, recipe.ingredients, recipe.instructions]
        );
    }

    console.log('Sample recipes inserted');
}

// User functions
const UserDB = {
    create(data) {
        const hashedPassword = bcrypt.hashSync(data.password, 10);

        // Check if email exists
        const existing = runQuery('SELECT id FROM users WHERE email = ?', [data.email.toLowerCase()]);
        if (existing.length > 0) {
            return null;
        }

        const userId = runInsert(
            `INSERT INTO users (email, password, first_name, last_name, cooking_skill, household_size, weekly_budget, meals_per_week)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.email.toLowerCase(),
                hashedPassword,
                data.firstName,
                data.lastName,
                data.cookingSkill || 'intermediate',
                data.householdSize || '2',
                data.weeklyBudget || 'moderate',
                data.mealsPerWeek || '4-7'
            ]
        );

        if (!userId) return null;

        // Insert dietary restrictions
        if (data.dietary && data.dietary.length > 0) {
            for (const d of data.dietary) {
                runInsert('INSERT OR IGNORE INTO user_dietary (user_id, dietary) VALUES (?, ?)', [userId, d]);
            }
        }

        // Insert cuisine preferences
        if (data.cuisines && data.cuisines.length > 0) {
            for (const c of data.cuisines) {
                runInsert('INSERT OR IGNORE INTO user_cuisines (user_id, cuisine) VALUES (?, ?)', [userId, c]);
            }
        }

        return this.getById(userId);
    },

    getById(id) {
        const users = runQuery('SELECT * FROM users WHERE id = ?', [id]);
        if (users.length === 0) return null;

        const user = users[0];

        // Get dietary restrictions
        const dietary = runQuery('SELECT dietary FROM user_dietary WHERE user_id = ?', [id]);
        user.dietary = dietary.map(d => d.dietary);

        // Get cuisines
        const cuisines = runQuery('SELECT cuisine FROM user_cuisines WHERE user_id = ?', [id]);
        user.cuisines = cuisines.map(c => c.cuisine);

        // Get liked recipes count
        const liked = runQuery('SELECT COUNT(*) as count FROM liked_recipes WHERE user_id = ?', [id]);
        user.likedCount = liked[0]?.count || 0;

        // Get grocery items count
        const grocery = runQuery('SELECT COUNT(*) as count FROM grocery_items WHERE user_id = ?', [id]);
        user.groceryCount = grocery[0]?.count || 0;

        return this.formatUser(user);
    },

    getByEmail(email) {
        const users = runQuery('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        if (users.length === 0) return null;
        return this.getById(users[0].id);
    },

    authenticate(email, password) {
        const users = runQuery('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        if (users.length === 0) return null;

        if (bcrypt.compareSync(password, users[0].password)) {
            return this.getById(users[0].id);
        }
        return null;
    },

    update(id, data) {
        const updates = [];
        const values = [];

        if (data.firstName) { updates.push('first_name = ?'); values.push(data.firstName); }
        if (data.lastName) { updates.push('last_name = ?'); values.push(data.lastName); }
        if (data.cookingSkill) { updates.push('cooking_skill = ?'); values.push(data.cookingSkill); }
        if (data.householdSize) { updates.push('household_size = ?'); values.push(data.householdSize); }
        if (data.weeklyBudget) { updates.push('weekly_budget = ?'); values.push(data.weeklyBudget); }
        if (data.mealsPerWeek) { updates.push('meals_per_week = ?'); values.push(data.mealsPerWeek); }

        if (updates.length > 0) {
            updates.push('updated_at = CURRENT_TIMESTAMP');
            values.push(id);
            runUpdate(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        if (data.dietary) {
            runUpdate('DELETE FROM user_dietary WHERE user_id = ?', [id]);
            for (const d of data.dietary) {
                runInsert('INSERT INTO user_dietary (user_id, dietary) VALUES (?, ?)', [id, d]);
            }
        }

        if (data.cuisines) {
            runUpdate('DELETE FROM user_cuisines WHERE user_id = ?', [id]);
            for (const c of data.cuisines) {
                runInsert('INSERT INTO user_cuisines (user_id, cuisine) VALUES (?, ?)', [id, c]);
            }
        }

        return this.getById(id);
    },

    delete(id) {
        runUpdate('DELETE FROM users WHERE id = ?', [id]);
    },

    formatUser(user) {
        return {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            cookingSkill: user.cooking_skill,
            householdSize: user.household_size,
            weeklyBudget: user.weekly_budget,
            mealsPerWeek: user.meals_per_week,
            dietary: user.dietary || [],
            cuisines: user.cuisines || [],
            likedCount: user.likedCount || 0,
            groceryCount: user.groceryCount || 0,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        };
    }
};

// Recipe functions
const RecipeDB = {
    getAll() {
        return runQuery('SELECT * FROM recipes ORDER BY id').map(this.formatRecipe);
    },

    getById(id) {
        const recipes = runQuery('SELECT * FROM recipes WHERE id = ?', [id]);
        return recipes.length > 0 ? this.formatRecipe(recipes[0]) : null;
    },

    getForUser(userId, limit = 10) {
        const recipes = runQuery(`
            SELECT r.* FROM recipes r
            WHERE r.id NOT IN (SELECT recipe_id FROM disliked_recipes WHERE user_id = ?)
            AND r.id NOT IN (SELECT recipe_id FROM liked_recipes WHERE user_id = ?)
            ORDER BY RANDOM()
            LIMIT ?
        `, [userId, userId, limit]);

        return recipes.map(this.formatRecipe);
    },

    getLiked(userId) {
        const recipes = runQuery(`
            SELECT r.*, lr.liked_at FROM recipes r
            JOIN liked_recipes lr ON r.id = lr.recipe_id
            WHERE lr.user_id = ?
            ORDER BY lr.liked_at DESC
        `, [userId]);

        return recipes.map(this.formatRecipe);
    },

    like(userId, recipeId) {
        runUpdate('DELETE FROM disliked_recipes WHERE user_id = ? AND recipe_id = ?', [userId, recipeId]);
        return runInsert('INSERT OR IGNORE INTO liked_recipes (user_id, recipe_id) VALUES (?, ?)', [userId, recipeId]);
    },

    dislike(userId, recipeId) {
        runUpdate('DELETE FROM liked_recipes WHERE user_id = ? AND recipe_id = ?', [userId, recipeId]);
        return runInsert('INSERT OR IGNORE INTO disliked_recipes (user_id, recipe_id) VALUES (?, ?)', [userId, recipeId]);
    },

    unlike(userId, recipeId) {
        runUpdate('DELETE FROM liked_recipes WHERE user_id = ? AND recipe_id = ?', [userId, recipeId]);
    },

    formatRecipe(recipe) {
        return {
            id: recipe.id,
            name: recipe.name,
            description: recipe.description,
            cookTime: recipe.cook_time,
            servings: recipe.servings,
            difficulty: recipe.difficulty,
            cuisine: recipe.cuisine,
            emoji: recipe.emoji,
            ingredients: recipe.ingredients ? recipe.ingredients.split(',') : [],
            instructions: recipe.instructions,
            createdAt: recipe.created_at
        };
    }
};

// Grocery functions
const GroceryDB = {
    getAll(userId) {
        return runQuery('SELECT * FROM grocery_items WHERE user_id = ? ORDER BY added_at DESC', [userId]).map(this.formatItem);
    },

    add(userId, item) {
        const id = runInsert(
            `INSERT INTO grocery_items (user_id, name, quantity, unit, category)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, item.name, item.quantity || 1, item.unit || '', item.category || 'Other']
        );
        return this.getById(id);
    },

    getById(id) {
        const items = runQuery('SELECT * FROM grocery_items WHERE id = ?', [id]);
        return items.length > 0 ? this.formatItem(items[0]) : null;
    },

    update(id, data) {
        const updates = [];
        const values = [];

        if (data.name) { updates.push('name = ?'); values.push(data.name); }
        if (data.quantity !== undefined) { updates.push('quantity = ?'); values.push(data.quantity); }
        if (data.checked !== undefined) { updates.push('checked = ?'); values.push(data.checked ? 1 : 0); }

        if (updates.length > 0) {
            values.push(id);
            runUpdate(`UPDATE grocery_items SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        return this.getById(id);
    },

    toggle(id) {
        runUpdate('UPDATE grocery_items SET checked = NOT checked WHERE id = ?', [id]);
        return this.getById(id);
    },

    delete(id) {
        runUpdate('DELETE FROM grocery_items WHERE id = ?', [id]);
    },

    clearAll(userId) {
        runUpdate('DELETE FROM grocery_items WHERE user_id = ?', [userId]);
    },

    formatItem(item) {
        return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            checked: item.checked === 1,
            addedAt: item.added_at
        };
    }
};

// Meal plan functions
const MealPlanDB = {
    getAll(userId) {
        return runQuery(`
            SELECT mp.*, r.name as recipe_name, r.emoji as recipe_emoji
            FROM meal_plans mp
            JOIN recipes r ON mp.recipe_id = r.id
            WHERE mp.user_id = ?
            ORDER BY mp.plan_date, mp.meal_type
        `, [userId]);
    },

    add(userId, recipeId, date, mealType) {
        return runInsert(
            `INSERT OR REPLACE INTO meal_plans (user_id, recipe_id, plan_date, meal_type)
             VALUES (?, ?, ?, ?)`,
            [userId, recipeId, date, mealType]
        );
    },

    remove(userId, date, mealType) {
        runUpdate('DELETE FROM meal_plans WHERE user_id = ? AND plan_date = ? AND meal_type = ?', [userId, date, mealType]);
    },

    clearWeek(userId, startDate) {
        runUpdate('DELETE FROM meal_plans WHERE user_id = ? AND plan_date >= ? AND plan_date < date(?, "+7 days")', [userId, startDate, startDate]);
    }
};

module.exports = {
    initDatabase,
    UserDB,
    RecipeDB,
    GroceryDB,
    MealPlanDB
};
