// Check authentication
if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'index.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = localStorage.getItem('currentUser');
    document.getElementById('userWelcome').textContent = `Welcome, ${currentUser}!`;
    
    loadProducts();
    updateTotals();
    
    // Event listeners
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('addProductBtn').addEventListener('click', addProduct);
    
    // Rate change listeners
    document.getElementById('cbmRate').addEventListener('input', updateAllCalculations);
    document.getElementById('dollarRate').addEventListener('input', updateAllCalculations);
    document.getElementById('yuanRate').addEventListener('input', updateAllCalculations);
});

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'index.html';
}

let products = JSON.parse(localStorage.getItem('products')) || [];

function addProduct() {
    const product = {
        id: Date.now(),
        name: '',
        length: 0,
        width: 0,
        height: 0,
        productCost: 0,
        localShipping: 0
    };
    
    products.push(product);
    saveProducts();
    renderProducts();
}

function deleteProduct(id) {
    products = products.filter(p => p.id !== id);
    saveProducts();
    renderProducts();
    updateTotals();
}

function updateProduct(id, field, value) {
    const product = products.find(p => p.id === id);
    if (product) {
        product[field] = field === 'name' ? value : parseFloat(value) || 0;
        saveProducts();
        updateProductCalculations(id);
        updateTotals();
    }
}

function calculateCBM(length, width, height) {
    return (length * width * height) / 1000000;
}

function calculateShippingCost(cbm) {
    const cbmRate = parseFloat(document.getElementById('cbmRate').value) || 0;
    const dollarRate = parseFloat(document.getElementById('dollarRate').value) || 0;
    return cbm * cbmRate * dollarRate;
}

function calculateProductCost(productCostYuan, localShippingYuan) {
    const yuanRate = parseFloat(document.getElementById('yuanRate').value) || 0;
    return (productCostYuan + localShippingYuan) * yuanRate;
}

function updateProductCalculations(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const cbm = calculateCBM(product.length, product.width, product.height);
    const shippingCost = calculateShippingCost(cbm);
    const productCostCedis = calculateProductCost(product.productCost, product.localShipping);
    const totalCost = productCostCedis + shippingCost;
    
    // Update DOM
    const row = document.querySelector(`[data-id="${id}"]`);
    if (row) {
        row.querySelector('.cbm').textContent = cbm.toFixed(6);
        row.querySelector('.total-yuan').textContent = (product.productCost + product.localShipping).toFixed(2);
        row.querySelector('.product-cedis').textContent = productCostCedis.toFixed(2);
        row.querySelector('.shipping-cedis').textContent = shippingCost.toFixed(2);
        row.querySelector('.total-cedis').textContent = totalCost.toFixed(2);
    }
}

function updateAllCalculations() {
    products.forEach(product => updateProductCalculations(product.id));
    updateTotals();
}

function updateTotals() {
    let totalCBM = 0;
    let totalProductCost = 0;
    let totalShippingCost = 0;
    let grandTotal = 0;
    
    products.forEach(product => {
        const cbm = calculateCBM(product.length, product.width, product.height);
        const shippingCost = calculateShippingCost(cbm);
        const productCostCedis = calculateProductCost(product.productCost, product.localShipping);
        
        totalCBM += cbm;
        totalProductCost += productCostCedis;
        totalShippingCost += shippingCost;
        grandTotal += productCostCedis + shippingCost;
    });
    
    document.getElementById('totalCBM').textContent = totalCBM.toFixed(6);
    document.getElementById('totalProductCost').textContent = totalProductCost.toFixed(2);
    document.getElementById('totalShippingCost').textContent = totalShippingCost.toFixed(2);
    document.getElementById('grandTotal').textContent = grandTotal.toFixed(2);
}

function renderProducts() {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';
    
    products.forEach(product => {
        const cbm = calculateCBM(product.length, product.width, product.height);
        const shippingCost = calculateShippingCost(cbm);
        const productCostCedis = calculateProductCost(product.productCost, product.localShipping);
        const totalCost = productCostCedis + shippingCost;
        
        const row = document.createElement('tr');
        row.setAttribute('data-id', product.id);
        row.innerHTML = `
            <td>
                <input type="text" class="input-cell" value="${product.name}" 
                       onchange="updateProduct(${product.id}, 'name', this.value)"
                       placeholder="Product name">
            </td>
            <td>
                <input type="number" class="input-cell" value="${product.length}" 
                       onchange="updateProduct(${product.id}, 'length', this.value)" step="0.1">
            </td>
            <td>
                <input type="number" class="input-cell" value="${product.width}" 
                       onchange="updateProduct(${product.id}, 'width', this.value)" step="0.1">
            </td>
            <td>
                <input type="number" class="input-cell" value="${product.height}" 
                       onchange="updateProduct(${product.id}, 'height', this.value)" step="0.1">
            </td>
            <td class="calc-cell cbm">${cbm.toFixed(6)}</td>
            <td>
                <input type="number" class="input-cell" value="${product.productCost}" 
                       onchange="updateProduct(${product.id}, 'productCost', this.value)" step="0.01">
            </td>
            <td>
                <input type="number" class="input-cell" value="${product.localShipping}" 
                       onchange="updateProduct(${product.id}, 'localShipping', this.value)" step="0.01">
            </td>
            <td class="calc-cell total-yuan">${(product.productCost + product.localShipping).toFixed(2)}</td>
            <td class="calc-cell product-cedis">${productCostCedis.toFixed(2)}</td>
            <td class="calc-cell shipping-cedis">${shippingCost.toFixed(2)}</td>
            <td class="calc-cell total-cedis">${totalCost.toFixed(2)}</td>
            <td>
                <button class="delete-btn" onclick="deleteProduct(${product.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function saveProducts() {
    localStorage.setItem('products', JSON.stringify(products));
}

function loadProducts() {
    products = JSON.parse(localStorage.getItem('products')) || [];
    renderProducts();
}