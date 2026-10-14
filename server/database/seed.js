const db = require('./db');
const bcrypt = require('bcrypt');

async function seedData() {
    console.log('Seeding initial marketplace data...');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    db.serialize(() => {
        // Reset tables cleanly
        db.run('DELETE FROM products');
        db.run('DELETE FROM categories');
        db.run('DELETE FROM complaints');
        db.run('DELETE FROM SQLITE_SEQUENCE WHERE name IN ("categories", "products", "complaints")');

        // Original Categories
        const categories = [
            'Ceramics & Pottery',
            'Leather Goods',
            'Jewelry',
            'Textiles & Tapestries',
            'Woodwork',
            'Home Decor'
        ];

        const catStmt = db.prepare('INSERT INTO categories (category_name) VALUES (?)');
        categories.forEach(cat => catStmt.run(cat));
        catStmt.finalize();

        // Users (Customer, Seller, Support Executive, Admin)
        const users = [
            { name: 'Alice Customer', email: 'customer@example.com', role: 'CUSTOMER', phone: '+91 98765 43210' },
            { name: 'Bob Artisan', email: 'seller@example.com', role: 'SELLER', phone: '+91 91234 56789' },
            { name: 'Charlie Support', email: 'support@example.com', role: 'SUPPORT', phone: '+91 99887 76655' },
            { name: 'Diana Admin', email: 'admin@example.com', role: 'ADMIN', phone: '+91 90000 11111' }
        ];

        users.forEach(user => {
            db.run(
                'INSERT OR REPLACE INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
                [user.name, user.email, passwordHash, user.role, user.phone]
            );
        });

        // Lookup real category IDs and seller ID
        db.all('SELECT category_id, category_name FROM categories', (cErr, catRows) => {
            if (cErr || !catRows) return;

            const catMap = {};
            catRows.forEach(c => { catMap[c.category_name] = c.category_id; });

            db.get('SELECT user_id FROM users WHERE email = "seller@example.com"', (err, seller) => {
                if (!seller) return;
                const sId = seller.user_id;

                const sampleProducts = [
                    // 1. Ceramics & Pottery
                    {
                        name: 'Hand-painted Ceramic Mug',
                        catName: 'Ceramics & Pottery',
                        desc: 'Hand-thrown stoneware mug painted with natural earthy glazes. Microwave and dishwasher safe.',
                        price: 450,
                        qty: 25,
                        img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80'
                    },
                    {
                        name: 'Handmade Terracotta Planter Pot',
                        catName: 'Ceramics & Pottery',
                        desc: 'Natural porous terracotta planter with artisan carved geometric patterns for indoor plants.',
                        price: 380,
                        qty: 18,
                        img: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&auto=format&fit=crop&q=80'
                    },

                    // 2. Leather Goods
                    {
                        name: 'Handcrafted Full-Grain Leather Journal',
                        catName: 'Leather Goods',
                        desc: 'Hand-stitched vegetable-tanned leather notebook with deckle-edge handmade cotton paper.',
                        price: 850,
                        qty: 20,
                        img: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80'
                    },
                    {
                        name: 'Vintage Hand-Stitched Leather Wallet',
                        catName: 'Leather Goods',
                        desc: 'Compact minimalist bifold leather wallet crafted from durable saddle leather with burnished edges.',
                        price: 699,
                        qty: 15,
                        img: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80'
                    },

                    // 3. Jewelry
                    {
                        name: 'Antique Oxidized Silver Jhumka Earrings',
                        catName: 'Jewelry',
                        desc: 'Traditional handcrafted tribal silver filigree earrings with intricate floral carving.',
                        price: 499,
                        qty: 30,
                        img: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=crop&q=80'
                    },
                    {
                        name: 'Terracotta Handcrafted Pendant Necklace',
                        catName: 'Jewelry',
                        desc: 'Sun-baked clay pendant hand-painted with eco-friendly pigments on adjustable braided cord.',
                        price: 350,
                        qty: 22,
                        img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80'
                    },

                    // 4. Textiles & Tapestries
                    {
                        name: 'Handwoven Macrame Wall Hanging Tapestry',
                        catName: 'Textiles & Tapestries',
                        desc: 'Bohemian wall tapestry hand-knotted using 100% organic unbleached cotton rope on natural driftwood.',
                        price: 950,
                        qty: 12,
                        img: 'https://images.unsplash.com/photo-1528458876861-544fd1761a91?w=600&auto=format&fit=crop&q=80'
                    },
                    {
                        name: 'Block-Printed Handloom Cotton Stole',
                        catName: 'Textiles & Tapestries',
                        desc: 'Hand-dyed with botanical indigo ink using hand-carved wooden blocks by master textile weavers.',
                        price: 650,
                        qty: 25,
                        img: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80'
                    },

                    // 5. Woodwork
                    {
                        name: 'Carved Sheesham Wood Spice Box',
                        catName: 'Woodwork',
                        desc: 'Traditional wooden spice container with 9 removable spice cups and transparent glass top.',
                        price: 1199,
                        qty: 14,
                        img: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80'
                    },
                    {
                        name: 'Handcrafted Teak Wood Serving Platter',
                        catName: 'Woodwork',
                        desc: 'Solid reclaimed teak wood board polished with organic food-safe beeswax finish.',
                        price: 799,
                        qty: 16,
                        img: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80'
                    },

                    // 6. Home Decor
                    {
                        name: 'Hand-Poured Soy Wax Botanical Candle',
                        catName: 'Home Decor',
                        desc: 'Artisanal aromatherapy candle with dried lavender and sandalwood essential oils in a ceramic vessel.',
                        price: 499,
                        qty: 35,
                        img: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&auto=format&fit=crop&q=80'
                    },
                    {
                        name: 'Brass Hand-Engraved Incense Holder',
                        catName: 'Home Decor',
                        desc: 'Vintage solid brass incense burner etched with traditional peacock motifs by heritage metalworkers.',
                        price: 550,
                        qty: 20,
                        img: 'https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?w=600&auto=format&fit=crop&q=80'
                    }
                ];

                const pStmt = db.prepare(
                    'INSERT INTO products (seller_id, category_id, name, description, price, quantity, image) VALUES (?, ?, ?, ?, ?, ?, ?)'
                );
                sampleProducts.forEach(p => {
                    const cId = catMap[p.catName];
                    if (cId) {
                        pStmt.run(sId, cId, p.name, p.desc, p.price, p.qty, p.img);
                    }
                });
                pStmt.finalize();

                // Seed sample complaints
                db.get('SELECT user_id FROM users WHERE email = "customer@example.com"', (custErr, cust) => {
                    if (cust) {
                        db.run(
                            'INSERT INTO complaints (customer_id, order_id, description, status, response) VALUES (?, NULL, ?, ?, ?)',
                            [
                                cust.user_id,
                                'Hello, I would like to check if the ceramic mugs are safe for microwave and dishwasher use.',
                                'Responded',
                                'Hi Alice! Yes, all our hand-thrown stoneware ceramics are double-fired and 100% microwave and dishwasher safe.'
                            ]
                        );
                        db.run(
                            'INSERT INTO complaints (customer_id, order_id, description, status, response) VALUES (?, NULL, ?, ?, ?)',
                            [
                                cust.user_id,
                                'Can the artisan customize the engraved brass incense holder with initials for a housewarming gift?',
                                'Pending',
                                null
                            ]
                        );
                    }
                    console.log('Database re-seeded successfully with all original categories and products!');
                });
            });
        });
    });
}

setTimeout(seedData, 600);
