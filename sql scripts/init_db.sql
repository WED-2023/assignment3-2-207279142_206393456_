
use grandma_recipes;-- Drop if exists for safety during dev
DROP TABLE IF EXISTS search_history, family_recipes, viewed_recipes, favorites, ingredients, recipes, users;


-- Create users table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    country VARCHAR(50),
    password VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    profilePic TEXT
);

-- Create recipes table
CREATE TABLE recipes (
    recipe_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    image_url TEXT,
    ready_in_minutes INT,
    vegetarian BOOLEAN DEFAULT FALSE,
    vegan BOOLEAN DEFAULT FALSE,
    gluten_free BOOLEAN DEFAULT FALSE,
    likes INT DEFAULT 0,
    instructions TEXT,
    user_id INT,
    servings INT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

ALTER TABLE recipes AUTO_INCREMENT = 10000000;

-- Create ingredients table
CREATE TABLE ingredients (
    ingredient_id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT,
    name VARCHAR(100),
    quantity VARCHAR(20),
    unit VARCHAR(20),
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id)
);

-- Create favorites table
CREATE TABLE favorites (
    user_id INT,
    recipe_id INT,
    PRIMARY KEY (user_id, recipe_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id)
);

-- Create viewed_recipes table
CREATE TABLE viewed_recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    recipe_id INT,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id)
);

-- Create family_recipes table
CREATE TABLE family_recipes (
    user_id INT,
    recipe_id INT,
    family_owner VARCHAR(100),
    event VARCHAR(100),
    PRIMARY KEY (user_id, recipe_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id)
);

-- Create search_history table
CREATE TABLE search_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    query VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Insert users
INSERT INTO users (username, first_name, last_name, country, password, email) VALUES
('maor123', 'Maor', 'Nezer', 'Israel', 'hashedpass1', 'maor@example.com'),
('sagi456', 'Sagi', 'Levi', 'USA', 'hashedpass2', 'sagi@example.com'),
('liel789', 'Liel', 'Cohen', 'France', 'hashedpass3', 'liel@example.com');

-- Insert recipes
INSERT INTO recipes (title, image_url, ready_in_minutes, vegetarian, vegan, gluten_free, likes, instructions, user_id, servings) VALUES
('Pasta', 'http://example.com/pasta.jpg', 20, TRUE, FALSE, FALSE, 5, 'Boil pasta. Add sauce.', 1, 2),
('Burger', 'http://example.com/burger.jpg', 30, FALSE, FALSE, TRUE, 10, 'Grill meat. Add toppings.', 2, 1);

-- Insert ingredients
INSERT INTO ingredients (recipe_id, name, quantity, unit) VALUES
(1, 'Pasta', '200', 'grams'),
(1, 'Tomato Sauce', '150', 'ml'),
(2, 'Beef', '300', 'grams'),
(2, 'Bun', '1', 'unit'),
(2, 'Lettuce', '50', 'grams');

-- Insert favorites
INSERT INTO favorites (user_id, recipe_id) VALUES
(1, 2),
(2, 1);

-- Insert viewed_recipes
INSERT INTO viewed_recipes (user_id, recipe_id) VALUES
(1, 1),
(1, 2),
(2, 1);

-- Insert family_recipes
INSERT INTO family_recipes (user_id, recipe_id, family_owner, event) VALUES
(1, 1, 'Grandma Rachel', 'Passover');

-- Insert search_history
INSERT INTO search_history (user_id, query) VALUES
(1, 'pasta'),
(2, 'vegan burger');



