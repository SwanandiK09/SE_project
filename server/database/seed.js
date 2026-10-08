const db = require('./db');
const bcrypt = require('bcrypt');

async function seedData() {
    console.log('Seeding initial data...');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    db.serialize(() => {
        // Seed Categories
        const categories = [
            'Ceramics & Pottery',
            'Leather Goods',
            'Jewelry',
            'Textiles & Tapestries',
            'Woodwork'
        ];
        
        categories.forEach(cat => {
            db.run('INSERT OR IGNORE INTO categories (category_name) VALUES (?)', [cat]);
        });

        // Seed Users (One of each role)
        const users = [
            { name: 'Alice Customer', email: 'customer@example.com', role: 'CUSTOMER' },
            { name: 'Bob Artisan', email: 'seller@example.com', role: 'SELLER' },
            { name: 'Charlie Support', email: 'support@example.com', role: 'SUPPORT' },
            { name: 'Diana Admin', email: 'admin@example.com', role: 'ADMIN' }
        ];

        users.forEach(user => {
            db.run(
                'INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                [user.name, user.email, passwordHash, user.role]
            );
        });

        // Seed a sample product for Bob
        db.get('SELECT user_id FROM users WHERE email = "seller@example.com"', (err, row) => {
            if (row) {
                db.run(
                    'INSERT OR IGNORE INTO products (seller_id, category_id, name, description, price, quantity, image) VALUES (?, 1, "Hand-painted Ceramic Mug", "A beautiful handcrafted mug", 25.50, 10, "https://images.unsplash.com/photo-1610701596007-11502861dcfa")',
                    [row.user_id]
                );
            }
        });

        console.log('Seeding completed. You can start the server.');
    });
}

// Wait for DB to initialize before seeding
setTimeout(seedData, 1000);
