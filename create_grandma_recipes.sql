CREATE DATABASE IF NOT EXISTS grandma_recipes;

USE grandma_recipes;

-- Users Table
CREATE TABLE IF NOT EXISTS Users (
    username VARCHAR(8) PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    country VARCHAR(50),
    password VARCHAR(10) NOT NULL,
    confirm_password VARCHAR(10) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL
);

-- Recipes Table
CREATE TABLE IF NOT EXISTS Recipes (
    recipe_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    image VARCHAR(255),
    preparation_time INT,
    vegetarian BOOLEAN DEFAULT FALSE,
    vegan BOOLEAN DEFAULT FALSE,
    gluten_free BOOLEAN DEFAULT FALSE,
    likes INT DEFAULT 0,
    family_owner VARCHAR(50),
    family_event VARCHAR(50),
    servings INT,
    username VARCHAR(8),
    FOREIGN KEY (username) REFERENCES Users(username)
);


-- Favorites Table (Many-to-Many between Users and Recipes)
CREATE TABLE IF NOT EXISTS Favorites (
    username VARCHAR(8),
    recipe_id INT,
    PRIMARY KEY (username, recipe_id),
    FOREIGN KEY (username) REFERENCES Users(username),
    FOREIGN KEY (recipe_id) REFERENCES Recipes(recipe_id)
);
