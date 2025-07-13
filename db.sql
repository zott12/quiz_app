-- USERS
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL
  ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';
  UPDATE users SET role = 'admin' WHERE email = 'admin@exemplo.com';
);

-- FRIENDS
CREATE TABLE friends (
    user_id INT,
    friend_id INT,
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
);

-- CATEGORIES
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- QUESTIONS
CREATE TABLE questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(200) NOT NULL,
    category_id INT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- QUESTION_ANSWER
CREATE TABLE question_answer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    text VARCHAR(200) NOT NULL,
    is_correct TINYINT(1) NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- GAME_MODES
CREATE TABLE game_modes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- QUIZ_SESSIONS
CREATE TABLE quiz_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    game_mode_id INT NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (game_mode_id) REFERENCES game_modes(id) ON DELETE CASCADE
);

-- SCORES
CREATE TABLE scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    score INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
