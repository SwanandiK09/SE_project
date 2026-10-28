/**
 * Test Suite for Online Marketplace System
 * 
 * Requirement:
 * - 5 Test cases per module
 * - Exactly 1 test case failing per module (4 PASS, 1 FAIL)
 * 
 * Modules:
 * 1. Authentication & Authorization Module
 * 2. Product Management Module
 * 3. Shopping Cart Module
 * 4. Order & Payment Module
 * 5. Customer Complaints & Support Module
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5001';

// ANSI color formatting for clean console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    gray: '\x1b[90m',
    white: '\x1b[37m'
};

async function api(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    const config = {
        method: options.method || 'GET',
        headers
    };
    if (options.body) {
        config.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, config);
    let data;
    try {
        data = await res.json();
    } catch {
        data = null;
    }
    return { status: res.status, ok: res.ok, data };
}

// Global test results collector
const results = {
    total: 0,
    passed: 0,
    failed: 0,
    modules: {}
};

function recordTest(moduleName, testId, testTitle, passed, details) {
    if (!results.modules[moduleName]) {
        results.modules[moduleName] = { passed: 0, failed: 0, tests: [] };
    }
    results.total++;
    if (passed) {
        results.passed++;
        results.modules[moduleName].passed++;
    } else {
        results.failed++;
        results.modules[moduleName].failed++;
    }
    results.modules[moduleName].tests.push({
        id: testId,
        title: testTitle,
        passed,
        ...details
    });

    const statusBadge = passed
        ? `${colors.green}[PASS]${colors.reset}`
        : `${colors.red}[FAIL]${colors.reset}`;

    console.log(`  ${statusBadge} ${colors.bright}${testId}${colors.reset}: ${testTitle}`);
    if (!passed) {
        console.log(`         ${colors.yellow}Expected:${colors.reset} ${details.expected}`);
        console.log(`         ${colors.yellow}Actual:  ${colors.reset} ${details.actual}`);
        console.log(`         ${colors.red}Reason:  ${colors.reset} ${details.reason}`);
    } else {
        console.log(`         ${colors.gray}Observed:${colors.reset} ${details.actual}`);
    }
}

async function runAllTests() {
    console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}     ONLINE MARKETPLACE SYSTEM - MODULE TEST SUITE EXECUTION           ${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`${colors.gray}Target API URL: ${BASE_URL}${colors.reset}\n`);

    // Shared State across tests
    const timestamp = Date.now();
    let customerToken = '';
    let sellerToken = '';
    let supportToken = '';
    let customerUserId = null;
    let createdProductId = null;
    let addedCartId = null;
    let testOrderId = null;
    let testComplaintId = null;

    // Pre-requisite: Obtain tokens for existing seeded roles
    try {
        const custLogin = await api('/api/auth/login', {
            method: 'POST',
            body: { email: 'customer@example.com', password: 'password123' }
        });
        customerToken = custLogin.data?.token || '';
        customerUserId = custLogin.data?.user?.id;

        const sellerLogin = await api('/api/auth/login', {
            method: 'POST',
            body: { email: 'seller@example.com', password: 'password123' }
        });
        sellerToken = sellerLogin.data?.token || '';

        const supportLogin = await api('/api/auth/login', {
            method: 'POST',
            body: { email: 'support@example.com', password: 'password123' }
        });
        supportToken = supportLogin.data?.token || '';
    } catch (err) {
        console.error(`${colors.red}Failed to authenticate seeded users for test harness:${colors.reset}`, err.message);
    }

    // =========================================================================
    // MODULE 1: AUTHENTICATION & AUTHORIZATION MODULE
    // =========================================================================
    const MOD1 = 'Authentication & Authorization Module';
    console.log(`${colors.bright}${colors.magenta}--- Module 1: ${MOD1} ---${colors.reset}`);

    // TC-AUTH-01 (PASS): Valid user registration
    {
        const testUser = {
            name: 'Test QA User',
            email: `qa_user_${timestamp}@example.com`,
            password: 'SecurePassword123!',
            role: 'CUSTOMER',
            phone: '+91 99999 11111'
        };
        const res = await api('/api/auth/register', { method: 'POST', body: testUser });
        const passed = res.status === 201 && !!res.data?.token;
        recordTest(MOD1, 'TC-AUTH-01', 'User Registration with valid details', passed, {
            expected: 'HTTP 201 with JWT token',
            actual: `HTTP ${res.status} (${res.data?.user?.email || JSON.stringify(res.data)})`,
            reason: passed ? '' : 'Failed to register valid user'
        });
    }

    // TC-AUTH-02 (PASS): Valid user login
    {
        const res = await api('/api/auth/login', {
            method: 'POST',
            body: { email: 'customer@example.com', password: 'password123' }
        });
        const passed = res.status === 200 && !!res.data?.token;
        recordTest(MOD1, 'TC-AUTH-02', 'User Login with valid credentials', passed, {
            expected: 'HTTP 200 with JWT token and user info',
            actual: `HTTP ${res.status} (Role: ${res.data?.user?.role})`,
            reason: passed ? '' : 'Login failed for valid credentials'
        });
    }

    // TC-AUTH-03 (PASS): Duplicate email registration rejection
    {
        const res = await api('/api/auth/register', {
            method: 'POST',
            body: {
                name: 'Duplicate Guy',
                email: 'customer@example.com',
                password: 'password123',
                role: 'CUSTOMER'
            }
        });
        const passed = res.status === 400 && res.data?.msg === 'User already exists';
        recordTest(MOD1, 'TC-AUTH-03', 'Reject duplicate email registration', passed, {
            expected: 'HTTP 400 with "User already exists"',
            actual: `HTTP ${res.status} (${res.data?.msg || res.data?.error})`,
            reason: passed ? '' : 'Duplicate user was not rejected properly'
        });
    }

    // TC-AUTH-04 (PASS): Invalid password login rejection
    {
        const res = await api('/api/auth/login', {
            method: 'POST',
            body: { email: 'customer@example.com', password: 'IncorrectWrongPassword!' }
        });
        const passed = res.status === 400 && res.data?.msg === 'Invalid credentials';
        recordTest(MOD1, 'TC-AUTH-04', 'Reject login with invalid password', passed, {
            expected: 'HTTP 400 with "Invalid credentials"',
            actual: `HTTP ${res.status} (${res.data?.msg || res.data?.error})`,
            reason: passed ? '' : 'Incorrect password was not rejected'
        });
    }

    // TC-AUTH-05 (FAIL): Enforce password complexity / minimum length requirement
    {
        // Requirement Spec: Passwords must be at least 8 characters long for security compliance
        const weakUser = {
            name: 'Weak Password User',
            email: `weak_${timestamp}@example.com`,
            password: '123', // Insecure 3-char password
            role: 'CUSTOMER'
        };
        const res = await api('/api/auth/register', { method: 'POST', body: weakUser });
        // The test specifies that weak passwords MUST be rejected with HTTP 400
        const passed = res.status === 400 && res.data?.msg?.includes('at least 8 characters');
        recordTest(MOD1, 'TC-AUTH-05', 'Enforce minimum password length (>= 8 chars)', passed, {
            expected: 'HTTP 400 Bad Request ("Password must be at least 8 characters")',
            actual: `HTTP ${res.status} (${res.status === 201 ? 'User created with weak 3-char password' : JSON.stringify(res.data)})`,
            reason: 'Security Validation Gap: Backend allows weak passwords without length checks'
        });
    }

    console.log();

    // =========================================================================
    // MODULE 2: PRODUCT MANAGEMENT MODULE
    // =========================================================================
    const MOD2 = 'Product Management Module';
    console.log(`${colors.bright}${colors.magenta}--- Module 2: ${MOD2} ---${colors.reset}`);

    // TC-PROD-01 (PASS): Browse all products
    {
        const res = await api('/api/products');
        const passed = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
        recordTest(MOD2, 'TC-PROD-01', 'Browse all available products catalog', passed, {
            expected: 'HTTP 200 with non-empty product list array',
            actual: `HTTP ${res.status} (${res.data?.length || 0} products returned)`,
            reason: passed ? '' : 'Failed to retrieve product list'
        });
    }

    // TC-PROD-02 (PASS): Filter products by search term
    {
        const res = await api('/api/products?search=Ceramic');
        const passed = res.status === 200 && Array.isArray(res.data) && res.data.every(p => p.name.toLowerCase().includes('ceramic'));
        recordTest(MOD2, 'TC-PROD-02', 'Search products by keyword ("Ceramic")', passed, {
            expected: 'HTTP 200 with only ceramic products',
            actual: `HTTP ${res.status} (${res.data?.length || 0} matching items)`,
            reason: passed ? '' : 'Search query did not filter products properly'
        });
    }

    // TC-PROD-03 (PASS): Get specific product details by ID
    {
        const res = await api('/api/products/1');
        const passed = res.status === 200 && res.data?.product_id === 1 && !!res.data?.name;
        recordTest(MOD2, 'TC-PROD-03', 'Retrieve product details by Product ID', passed, {
            expected: 'HTTP 200 with matching product object',
            actual: `HTTP ${res.status} ("${res.data?.name}", Price: ${res.data?.price})`,
            reason: passed ? '' : 'Failed to retrieve product #1'
        });
    }

    // TC-PROD-04 (PASS): Prevent non-seller from creating product
    {
        const res = await api('/api/products', {
            method: 'POST',
            headers: { Authorization: `Bearer ${customerToken}` },
            body: {
                category_id: 1,
                name: 'Unauthorized Product by Customer',
                price: 100,
                quantity: 10
            }
        });
        const passed = res.status === 403;
        recordTest(MOD2, 'TC-PROD-04', 'Block non-seller (Customer) from adding product', passed, {
            expected: 'HTTP 403 Forbidden',
            actual: `HTTP ${res.status} (${res.data?.msg || res.data?.error})`,
            reason: passed ? '' : 'Customer was improperly permitted to add products'
        });
    }

    // TC-PROD-05 (FAIL): Reject negative product price
    {
        // Requirement Spec: Product price must be greater than zero (> 0)
        const res = await api('/api/products', {
            method: 'POST',
            headers: { Authorization: `Bearer ${sellerToken}` },
            body: {
                category_id: 1,
                name: 'Invalid Negative Price Item',
                description: 'Test product with invalid negative price',
                price: -150.00, // Invalid negative price
                quantity: 5
            }
        });
        // The business rule expects HTTP 400 Bad Request
        const passed = res.status === 400 && (res.data?.msg?.includes('positive') || res.data?.msg?.includes('price'));
        recordTest(MOD2, 'TC-PROD-05', 'Prevent negative price during product creation', passed, {
            expected: 'HTTP 400 Bad Request ("Price must be positive")',
            actual: `HTTP ${res.status} (${res.status === 201 ? 'Product created with price -150' : JSON.stringify(res.data)})`,
            reason: 'Input Validation Gap: System accepted negative price without validation'
        });
    }

    console.log();

    // =========================================================================
    // MODULE 3: SHOPPING CART MODULE
    // =========================================================================
    const MOD3 = 'Shopping Cart Module';
    console.log(`${colors.bright}${colors.magenta}--- Module 3: ${MOD3} ---${colors.reset}`);

    // TC-CART-01 (PASS): Add valid product to cart
    {
        const res = await api('/api/cart', {
            method: 'POST',
            headers: { Authorization: `Bearer ${customerToken}` },
            body: { product_id: 1, quantity: 1 }
        });
        const passed = (res.status === 201 || res.status === 200);
        recordTest(MOD3, 'TC-CART-01', 'Add in-stock product to shopping cart', passed, {
            expected: 'HTTP 200 or 201 Success',
            actual: `HTTP ${res.status} (${res.data?.msg})`,
            reason: passed ? '' : 'Failed to add item to cart'
        });
    }

    // TC-CART-02 (PASS): Retrieve customer cart contents
    {
        const res = await api('/api/cart', {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        const passed = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
        if (passed && res.data[0]) {
            addedCartId = res.data[0].cart_id;
        }
        recordTest(MOD3, 'TC-CART-02', 'Fetch customer cart contents', passed, {
            expected: 'HTTP 200 with cart items list',
            actual: `HTTP ${res.status} (${res.data?.length || 0} cart item(s) found)`,
            reason: passed ? '' : 'Failed to retrieve cart items'
        });
    }

    // TC-CART-03 (PASS): Reject adding quantity exceeding available stock
    {
        const res = await api('/api/cart', {
            method: 'POST',
            headers: { Authorization: `Bearer ${customerToken}` },
            body: { product_id: 1, quantity: 999999 } // Way more than in-stock
        });
        const passed = res.status === 400 && res.data?.msg?.includes('stock');
        recordTest(MOD3, 'TC-CART-03', 'Reject quantity exceeding available stock', passed, {
            expected: 'HTTP 400 with "Not enough stock available"',
            actual: `HTTP ${res.status} (${res.data?.msg})`,
            reason: passed ? '' : 'Excessive quantity was not rejected'
        });
    }

    // TC-CART-04 (PASS): Remove item from cart
    {
        // First ensure we have a cart item to delete
        let cartIdToDelete = addedCartId;
        if (!cartIdToDelete) {
            const tempCart = await api('/api/cart', {
                method: 'POST',
                headers: { Authorization: `Bearer ${customerToken}` },
                body: { product_id: 2, quantity: 1 }
            });
            const list = await api('/api/cart', { headers: { Authorization: `Bearer ${customerToken}` } });
            cartIdToDelete = list.data?.[0]?.cart_id;
        }

        const res = await api(`/api/cart/${cartIdToDelete}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        const passed = res.status === 200 && res.data?.msg === 'Item removed from cart';
        recordTest(MOD3, 'TC-CART-04', 'Remove an item from shopping cart', passed, {
            expected: 'HTTP 200 with "Item removed from cart"',
            actual: `HTTP ${res.status} (${res.data?.msg})`,
            reason: passed ? '' : 'Failed to remove item from cart'
        });
    }

    // TC-CART-05 (FAIL): Reject zero or negative quantity in cart
    {
        // Requirement Spec: Cart item quantity must be at least 1 (positive integer)
        const res = await api('/api/cart', {
            method: 'POST',
            headers: { Authorization: `Bearer ${customerToken}` },
            body: { product_id: 1, quantity: -2 } // Invalid negative quantity
        });
        const passed = res.status === 400 && res.data?.msg?.includes('positive');
        recordTest(MOD3, 'TC-CART-05', 'Reject negative quantity on cart add', passed, {
            expected: 'HTTP 400 Bad Request ("Quantity must be at least 1")',
            actual: `HTTP ${res.status} (${res.status === 200 || res.status === 201 ? 'Cart accepted quantity -2' : JSON.stringify(res.data)})`,
            reason: 'Boundary Value Gap: System permits negative quantity addition to cart'
        });
    }

    console.log();

    // =========================================================================
    // MODULE 4: ORDER & PAYMENT MODULE
    // =========================================================================
    const MOD4 = 'Order & Payment Processing Module';
    console.log(`${colors.bright}${colors.magenta}--- Module 4: ${MOD4} ---${colors.reset}`);

    // TC-ORD-01 (PASS): Successful order placement with cart items
    {
        // Ensure cart has an item before checking out
        await api('/api/cart', {
            method: 'POST',
            headers: { Authorization: `Bearer ${customerToken}` },
            body: { product_id: 1, quantity: 1 }
        });

        const res = await api('/api/orders', {
            method: 'POST',
            headers: { Authorization: `Bearer ${customerToken}` },
            body: {
                shipping_address: '123 Heritage Lane, Jaipur, India',
                payment_method: 'UPI'
            }
        });
        const passed = res.status === 201 && !!res.data?.order_id;
        if (passed) {
            testOrderId = res.data.order_id;
        }
        recordTest(MOD4, 'TC-ORD-01', 'Place order and complete payment checkout', passed, {
            expected: 'HTTP 201 with generated order_id',
            actual: `HTTP ${res.status} (Order ID: ${res.data?.order_id})`,
            reason: passed ? '' : 'Failed to place order'
        });
    }

    // TC-ORD-02 (PASS): Reject checkout when cart is empty
    {
        // Cart was cleared by previous checkout, so it should be empty now
        const res = await api('/api/orders', {
            method: 'POST',
            headers: { Authorization: `Bearer ${customerToken}` },
            body: {
                shipping_address: '123 Heritage Lane, Jaipur, India',
                payment_method: 'UPI'
            }
        });
        const passed = res.status === 400 && res.data?.msg === 'Cart is empty';
        recordTest(MOD4, 'TC-ORD-02', 'Prevent checkout when shopping cart is empty', passed, {
            expected: 'HTTP 400 with "Cart is empty"',
            actual: `HTTP ${res.status} (${res.data?.msg})`,
            reason: passed ? '' : 'Empty cart checkout was not blocked'
        });
    }

    // TC-ORD-03 (PASS): Retrieve customer order history
    {
        const res = await api('/api/orders', {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        const passed = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
        recordTest(MOD4, 'TC-ORD-03', 'Retrieve customer order history', passed, {
            expected: 'HTTP 200 with list of customer orders',
            actual: `HTTP ${res.status} (${res.data?.length || 0} order(s) retrieved)`,
            reason: passed ? '' : 'Failed to retrieve order history'
        });
    }

    // TC-ORD-04 (PASS): Missing shipping address validation
    {
        // Add item to cart first
        await api('/api/cart', {
            method: 'POST',
            headers: { Authorization: `Bearer ${customerToken}` },
            body: { product_id: 1, quantity: 1 }
        });

        const res = await api('/api/orders', {
            method: 'POST',
            headers: { Authorization: `Bearer ${customerToken}` },
            body: {
                shipping_address: '', // Missing address
                payment_method: 'Credit Card'
            }
        });
        const passed = res.status === 400 && res.data?.msg?.includes('required');
        recordTest(MOD4, 'TC-ORD-04', 'Reject order with missing shipping address', passed, {
            expected: 'HTTP 400 with "Shipping address and payment method required"',
            actual: `HTTP ${res.status} (${res.data?.msg})`,
            reason: passed ? '' : 'Order placed without mandatory shipping address'
        });
    }

    // TC-ORD-05 (FAIL): Validate supported payment methods (Enum Check)
    {
        // Requirement Spec: Only allowed payment methods ('UPI', 'Credit Card', 'Debit Card', 'Cash on Delivery') should be processed
        const res = await api('/api/orders', {
            method: 'POST',
            headers: { Authorization: `Bearer ${customerToken}` },
            body: {
                shipping_address: '456 Test Blvd, Pune',
                payment_method: 'INVALID_CRYPTO_TOKEN_METHOD' // Unauthorized payment method
            }
        });
        // Business rule expects validation error 400
        const passed = res.status === 400 && res.data?.msg?.includes('payment method');
        recordTest(MOD4, 'TC-ORD-05', 'Enforce valid payment method whitelist', passed, {
            expected: 'HTTP 400 Bad Request ("Invalid payment method")',
            actual: `HTTP ${res.status} (${res.status === 201 ? 'Order placed with unauthorized payment method' : JSON.stringify(res.data)})`,
            reason: 'Domain Constraint Gap: Server accepts arbitrary payment method strings'
        });
    }

    console.log();

    // =========================================================================
    // MODULE 5: CUSTOMER COMPLAINTS & SUPPORT MODULE
    // =========================================================================
    const MOD5 = 'Customer Complaints & Support Module';
    console.log(`${colors.bright}${colors.magenta}--- Module 5: ${MOD5} ---${colors.reset}`);

    // TC-COMP-01 (PASS): Submit a valid customer complaint
    {
        const res = await api('/api/complaints', {
            method: 'POST',
            headers: { Authorization: `Bearer ${customerToken}` },
            body: {
                order_id: testOrderId || null,
                description: 'The ceramic mug glaze arrived with a hairline crack.'
            }
        });
        const passed = res.status === 201 && !!res.data?.complaint_id;
        if (passed) {
            testComplaintId = res.data.complaint_id;
        }
        recordTest(MOD5, 'TC-COMP-01', 'Customer files complaint with valid description', passed, {
            expected: 'HTTP 201 with generated complaint_id',
            actual: `HTTP ${res.status} (Complaint ID: ${res.data?.complaint_id})`,
            reason: passed ? '' : 'Failed to file complaint'
        });
    }

    // TC-COMP-02 (PASS): Reject complaint with empty description
    {
        const res = await api('/api/complaints', {
            method: 'POST',
            headers: { Authorization: `Bearer ${customerToken}` },
            body: {
                order_id: testOrderId || null,
                description: '   ' // Empty whitespace description
            }
        });
        const passed = res.status === 400 && res.data?.msg === 'Please provide a complaint description';
        recordTest(MOD5, 'TC-COMP-02', 'Reject complaint with empty description', passed, {
            expected: 'HTTP 400 with "Please provide a complaint description"',
            actual: `HTTP ${res.status} (${res.data?.msg})`,
            reason: passed ? '' : 'Empty complaint was not rejected'
        });
    }

    // TC-COMP-03 (PASS): Customer views their own filed complaints
    {
        const res = await api('/api/complaints/my', {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        const passed = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
        recordTest(MOD5, 'TC-COMP-03', 'Customer views their filed complaints history', passed, {
            expected: 'HTTP 200 with complaints array',
            actual: `HTTP ${res.status} (${res.data?.length || 0} complaint(s) found)`,
            reason: passed ? '' : 'Failed to retrieve customer complaints'
        });
    }

    // TC-COMP-04 (PASS): Support Executive updates complaint status and response
    {
        const complaintIdToUpdate = testComplaintId || 1;
        const res = await api(`/api/complaints/${complaintIdToUpdate}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${supportToken}` },
            body: {
                status: 'In Progress',
                response: 'Our artisan team has been notified and a replacement is being arranged.'
            }
        });
        const passed = res.status === 200 && res.data?.msg === 'Complaint updated successfully';
        recordTest(MOD5, 'TC-COMP-04', 'Support executive updates complaint status & response', passed, {
            expected: 'HTTP 200 with "Complaint updated successfully"',
            actual: `HTTP ${res.status} (Status set to "In Progress")`,
            reason: passed ? '' : 'Support update failed'
        });
    }

    // TC-COMP-05 (FAIL): Validate allowed status values with proper HTTP 400
    {
        // Requirement Spec: Status transitions must be validated against allowed domain values:
        // ['Pending', 'In Progress', 'Responded', 'Resolved'].
        // Invalid statuses should be rejected with HTTP 400 Bad Request before database execution.
        const complaintIdToUpdate = testComplaintId || 1;
        const res = await api(`/api/complaints/${complaintIdToUpdate}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${supportToken}` },
            body: {
                status: 'INVALID_STATUS_CODE', // Invalid status
                response: 'Testing illegal status transition'
            }
        });
        // Test expects HTTP 400 validation error
        const passed = res.status === 400 && res.data?.msg?.includes('Invalid status');
        recordTest(MOD5, 'TC-COMP-05', 'Validate complaint status transitions (HTTP 400 on illegal state)', passed, {
            expected: 'HTTP 400 Bad Request ("Invalid status value")',
            actual: `HTTP ${res.status} (${res.data?.error || res.data?.msg || JSON.stringify(res.data)})`,
            reason: 'Data Integrity / Error Handling Gap: Server crashes with 500 SQL CHECK constraint error instead of HTTP 400'
        });
    }

    console.log();

    // =========================================================================
    // SUMMARY REPORT
    // =========================================================================
    console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}                     TEST EXECUTION SUMMARY                           ${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);

    console.log(`\n${colors.bright}Module-by-Module Breakdown:${colors.reset}`);
    for (const [mod, data] of Object.entries(results.modules)) {
        const passBadge = `${colors.green}${data.passed} Passed${colors.reset}`;
        const failBadge = `${colors.red}${data.failed} Failed${colors.reset}`;
        console.log(`  • ${colors.bright}${mod.padEnd(42)}${colors.reset}: [ ${passBadge} | ${failBadge} ] (Total: ${data.tests.length})`);
    }

    console.log(`\n${colors.bright}Overall Totals:${colors.reset}`);
    console.log(`  • Total Tests Executed : ${colors.bright}${results.total}${colors.reset}`);
    console.log(`  • Total Tests Passed   : ${colors.green}${colors.bright}${results.passed}${colors.reset}`);
    console.log(`  • Total Tests Failed   : ${colors.red}${colors.bright}${results.failed}${colors.reset}`);
    console.log(`  • Expected Outcome     : Exactly 1 failing test per module (5 modules x 1 fail = 5 failed)`);
    console.log(`  • Condition Satisfied  : ${results.failed === 5 && results.passed === 20 ? colors.green + 'YES (4 PASS, 1 FAIL in all 5 modules)' : colors.yellow + 'VERIFY'}${colors.reset}\n`);

    return results;
}

// Execute runner
runAllTests().catch(err => {
    console.error('Test runner encountered unexpected error:', err);
    process.exit(1);
});
