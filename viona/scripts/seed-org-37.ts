/**
 * Seed Script for Viona Database
 * 
 * Generates fake data for org_id: 37, user_id: 6
 * 
 * Usage:
 *   npx ts-node scripts/seed-org-37.ts
 *   OR
 *   npx tsx scripts/seed-org-37.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ORG_ID = BigInt(4);
const USER_ID = BigInt(1);

// Product data
const PRODUCTS = [
  // Laptops
  { name: 'MacBook Pro 14"', sku: 'MBP-14-M3', price: 1999, description: 'Apple M3, 16GB RAM, 512GB SSD' },
  { name: 'MacBook Air 15"', sku: 'MBA-15-M2', price: 1499, description: 'Apple M2, 16GB RAM' },
  { name: 'Dell XPS 13 Plus', sku: 'DELL-XPS13P', price: 1699, description: 'Intel i7 Evo, OLED Display' },
  { name: 'Lenovo ThinkPad X1 Carbon', sku: 'LEN-X1C', price: 1899, description: 'Business Laptop, Ultra-light' },

  // Phones
  { name: 'iPhone 15 Pro', sku: 'IPH-15P', price: 999, description: '128GB, Titanium Blue' },
  { name: 'Samsung Galaxy S24 Ultra', sku: 'SG-S24U', price: 1299, description: '512GB, Titanium Black' },
  { name: 'Google Pixel 8', sku: 'PIX-8', price: 799, description: 'AI Camera, Clean Android' },

  // Tablets
  { name: 'iPad Air M2', sku: 'IPD-AIR-M2', price: 699, description: '256GB, Wi-Fi' },
  { name: 'Samsung Galaxy Tab S9', sku: 'SG-TABS9', price: 849, description: 'AMOLED Display' },

  // Audio
  { name: 'Sony WH-1000XM5', sku: 'SONY-XM5', price: 349, description: 'Noise Cancelling Headphones' },
  { name: 'Bose QuietComfort Ultra', sku: 'BOSE-QC-U', price: 379, description: 'Spatial Audio ANC' },
  { name: 'AirPods Pro 2', sku: 'APP-2', price: 249, description: 'USB-C, ANC' },

  // Gaming
  { name: 'PlayStation 5', sku: 'PS5-DISC', price: 499, description: 'Disc Edition' },
  { name: 'Xbox Series X', sku: 'XBX-X', price: 499, description: '1TB SSD' },
  { name: 'Nintendo Switch OLED', sku: 'NIN-OLED', price: 349, description: 'OLED Display' },

  // Accessories & Storage
  { name: 'Logitech MX Master 3S', sku: 'LOG-MX3S', price: 99, description: 'Wireless Mouse' },
  { name: 'Keychron Q1 Pro', sku: 'KEY-Q1P', price: 219, description: 'Mechanical Keyboard' },
  { name: 'Samsung T7 Shield 2TB', sku: 'SAM-T7-2TB', price: 179, description: 'Portable SSD' },
  { name: 'WD Black SN850X 2TB', sku: 'WD-SN850X', price: 189, description: 'NVMe Gen4 SSD' },

  // Networking & Power
  { name: 'TP-Link WiFi 6 Mesh', sku: 'TPL-MESH6', price: 399, description: 'Whole Home WiFi' },
  { name: 'Anker PowerCore 737', sku: 'ANK-737', price: 149, description: '140W Power Bank' },
];

// Warehouse data
const WAREHOUSES = [
    { name: "Main Warehouse", address: "123 Business Park, San Francisco, CA 94102" },
    { name: "East Coast Hub", address: "456 Commerce Drive, New York, NY 10001" },
    { name: "Midwest Distribution", address: "789 Industrial Blvd, Chicago, IL 60601" },
];

// Customer data for orders
const CUSTOMERS = [
  { name: 'Alex Morgan', email: 'alex.morgan@gmail.com', phone: '+1-555-1001' },
  { name: 'Priya Nair', email: 'priya.nair@gmail.com', phone: '+1-555-1002' },
  { name: 'Daniel Kim', email: 'dan.kim@gmail.com', phone: '+1-555-1003' },
  { name: 'Sophia Martinez', email: 'sophia.m@gmail.com', phone: '+1-555-1004' },
  { name: 'Chris Johnson', email: 'cjohnson@gmail.com', phone: '+1-555-1005' },
  { name: 'Aisha Khan', email: 'aisha.khan@gmail.com', phone: '+1-555-1006' },
  { name: 'Matthew Green', email: 'mgreen@gmail.com', phone: '+1-555-1007' },
  { name: 'Emily Chen', email: 'emily.chen@gmail.com', phone: '+1-555-1008' },
  { name: 'Rohit Sharma', email: 'rohit.sharma@gmail.com', phone: '+1-555-1009' },
  { name: 'Olivia Brown', email: 'olivia.b@gmail.com', phone: '+1-555-1010' },
  { name: 'James Wilson', email: 'jwilson@gmail.com', phone: '+1-555-1011' },
  { name: 'Neha Patel', email: 'neha.p@gmail.com', phone: '+1-555-1012' },
  { name: 'Ethan Walker', email: 'ethan.w@gmail.com', phone: '+1-555-1013' },
  { name: 'Isabella Rossi', email: 'isabella.r@gmail.com', phone: '+1-555-1014' },
  { name: 'Mohammed Ali', email: 'mali@gmail.com', phone: '+1-555-1015' },
];

const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number): Date {
    const now = new Date();
    const past = new Date(now.getTime() - randomInt(1, daysBack) * 24 * 60 * 60 * 1000);
    return past;
}

function randomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
    console.log("🌱 Starting seed for org_id: 37, user_id: 6...\n");

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { user_id: USER_ID } });
    if (!user) {
        console.log("❌ User with id 6 doesn't exist. Creating...");
        await prisma.user.create({
            data: {
                user_id: USER_ID,
                clerk_id: `seed_user_${USER_ID}`,
                email: `seeduser${USER_ID}@example.com`,
            },
        });
        console.log("✅ User created\n");
    }

    // Check if organization exists
    let org = await prisma.organization.findUnique({ where: { org_id: ORG_ID } });
    if (!org) {
        console.log("❌ Organization 37 doesn't exist. Creating...");
        org = await prisma.organization.create({
            data: {
                org_id: ORG_ID,
                name: "Viona Demo Store",
                created_by: USER_ID,
            },
        });
        console.log("✅ Organization created\n");
    }

    // Create warehouses
    console.log("📦 Creating warehouses...");
    const warehouseRecords = [];
    for (const wh of WAREHOUSES) {
        const existing = await prisma.warehouse.findFirst({
            where: { org_id: ORG_ID, name: wh.name },
        });
        if (!existing) {
            const record = await prisma.warehouse.create({
                data: { ...wh, org_id: ORG_ID },
            });
            warehouseRecords.push(record);
            console.log(`  ✅ Created: ${wh.name}`);
        } else {
            warehouseRecords.push(existing);
            console.log(`  ⏭️  Exists: ${wh.name}`);
        }
    }

    // Create products
    console.log("\n🛍️  Creating products...");
    const productRecords = [];
    for (const prod of PRODUCTS) {
        const existing = await prisma.product.findFirst({
            where: { org_id: ORG_ID, sku: prod.sku },
        });
        if (!existing) {
            const record = await prisma.product.create({
                data: {
                    name: prod.name,
                    sku: prod.sku,
                    description: prod.description,
                    org_id: ORG_ID,
                    created_by: USER_ID,
                    status: "active",
                },
            });

            // Create price
            await prisma.productPrice.create({
                data: {
                    product_id: record.product_id,
                    actual_price: prod.price,
                    retail_price: prod.price * 1.2,
                    market_price: prod.price * 1.1,
                    valid_from: new Date(),
                },
            });

            productRecords.push(record);
            console.log(`  ✅ Created: ${prod.name}`);
        } else {
            productRecords.push(existing);
            console.log(`  ⏭️  Exists: ${prod.name}`);
        }
    }

    // Create product stocks (randomly distribute across warehouses)
    console.log("\n📊 Creating stock levels...");
    for (const product of productRecords) {
        for (const warehouse of warehouseRecords) {
            const existing = await prisma.productStock.findFirst({
                where: {
                    product_id: product.product_id,
                    warehouse_id: warehouse.warehouse_id,
                },
            });

            if (!existing) {
                const qty = randomInt(5, 150);
                await prisma.productStock.create({
                    data: {
                        product_id: product.product_id,
                        warehouse_id: warehouse.warehouse_id,
                        quantity: qty,
                    },
                });
            }
        }
    }
    console.log(`  ✅ Stock created for ${productRecords.length} products across ${warehouseRecords.length} warehouses`);

    // Create orders
    console.log("\n🛒 Creating orders...");
    const ORDER_COUNT = 50;
    let ordersCreated = 0;

    for (let i = 0; i < ORDER_COUNT; i++) {
        const customer = randomElement(CUSTOMERS);
        const status = randomElement(ORDER_STATUSES);
        const orderDate = randomDate(90); // Last 90 days

        // Random items (1-4 products per order)
        const itemCount = randomInt(1, 4);
        const selectedProducts = [...productRecords]
            .sort(() => Math.random() - 0.5)
            .slice(0, itemCount);

        let totalAmount = 0;
        const orderItems = selectedProducts.map(prod => {
            const qty = randomInt(1, 3);
            const price = PRODUCTS.find(p => p.sku === prod.sku)?.price || 99.99;
            totalAmount += price * qty;
            return {
                product_id: prod.product_id,
                quantity: qty,
                price_at_order: price,
            };
        });

        // Create order
        const order = await prisma.order.create({
            data: {
                org_id: ORG_ID,
                placed_by: USER_ID,
                customer_name: customer.name,
                customer_email: customer.email,
                customer_phone: customer.phone,
                status: status,
                order_date: orderDate,
                total_amount: totalAmount,
                shipping_street: `${randomInt(100, 9999)} Main Street`,
                shipping_city: randomElement(["San Francisco", "Los Angeles", "New York", "Chicago", "Seattle"]),
                shipping_state: randomElement(["CA", "NY", "IL", "WA", "TX"]),
                shipping_zip: String(randomInt(10000, 99999)),
                shipping_country: "USA",
                payment_method: randomElement(["credit_card", "debit_card", "paypal", "bank_transfer"]),
                shipping_method: randomElement(["standard", "express", "overnight"]),
                notes: Math.random() > 0.7 ? "Please handle with care" : null,
            },
        });

        // Create order items
        for (const item of orderItems) {
            await prisma.orderItem.create({
                data: {
                    order_id: order.order_id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price_at_order: item.price_at_order,
                },
            });
        }

        ordersCreated++;
    }
    console.log(`  ✅ Created ${ordersCreated} orders`);

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("🎉 SEED COMPLETE!");
    console.log("=".repeat(50));
    console.log(`\n📊 Summary for org_id: 37`);
    console.log(`  • Warehouses: ${warehouseRecords.length}`);
    console.log(`  • Products: ${productRecords.length}`);
    console.log(`  • Stock entries: ${productRecords.length * warehouseRecords.length}`);
    console.log(`  • Orders: ${ordersCreated}`);
    console.log(`\n✅ Ready to use with Viona AI!\n`);
}

main()
    .catch((e) => {
        console.error("❌ Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
