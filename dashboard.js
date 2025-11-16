// GitHub Configuration - UPDATE THESE!
const GITHUB_USERNAME = 'kels-hub'; // Replace with your GitHub username
const REPO_NAME = 'ardibee'; // Replace with your repository name
const GITHUB_TOKEN = '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'; // Replace with your GitHub token
const BRANCH = 'main'; // or 'master' depending on your repo

const RAW_DATA_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH}/data/products.json`;
const API_DATA_URL = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/data/products.json`;

// Check authentication
if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'index.html';
}

// Global data
let products = [];
let rates = {
    cbmRate: 247,
    dollarRate: 15,
    yuanRate: 0.575
};
let currentSha = ''; // To track the file SHA

document.addEventListener('DOMContentLoaded', async function() {
    const currentUser = localStorage.getItem('currentUser');
    document.getElementById('userWelcome').textContent = `Welcome, ${currentUser}!`;
    
    // Setup event listeners first
    setupEventListeners();
    
    // Then load data
    await loadData();
});

function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('addProductBtn').addEventListener('click', addProduct);
    
    // Rate change listeners with debouncing
    let saveTimeout;
    const scheduleSave = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => saveData(), 1000);
    };
    
    document.getElementById('cbmRate').addEventListener('input', function() {
        rates.cbmRate = parseFloat(this.value) || 0;
        updateAllCalculations();
        scheduleSave();
    });
    
    document.getElementById('dollarRate').addEventListener('input', function() {
        rates.dollarRate = parseFloat(this.value) || 0;
        updateAllCalculations();
        scheduleSave();
    });
    
    document.getElementById('yuanRate').addEventListener('input', function() {
        rates.yuanRate = parseFloat(this.value) || 0;
        updateAllCalculations();
        scheduleSave();
    });
}

async function loadData() {
    showMessage('Loading data...', 'info');
    
    // Try GitHub first, then local storage
    try {
        await loadFromGitHub();
    } catch (error) {
        console.warn('GitHub load failed, trying local storage:', error);
        loadFromLocalStorage();
    }
}

async function loadFromGitHub() {
    try {
        const response = await fetch(RAW_DATA_URL + '?t=' + Date.now());
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Validate data structure
        if (data && (data.products || data.rates)) {
            products = data.products || [];
            rates = data.rates || rates;
            currentSha = data._sha || ''; // Store SHA if available
            
            // Update UI
            updateRatesUI();
            renderProducts();
            updateTotals();
            
            showMessage('Data loaded from cloud! ✅', 'success');
        } else {
            throw new Error('Invalid data format');
        }
    } catch (error) {
        throw new Error(`GitHub load failed: ${error.message}`);
    }
}

async function saveData() {
    if (!isGitHubConfigured()) {
        saveToLocalStorage();
        showMessage('Saved locally (GitHub not configured)', 'warning');
        return;
    }

    try {
        await saveToGitHub();
    } catch (error) {
        console.error('GitHub save failed:', error);
        saveToLocalStorage();
        showMessage('Saved locally (cloud save failed)', 'warning');
    }
}

async function saveToGitHub() {
    // Prepare the data
    const data = {
        products: products,
        rates: rates,
        lastUpdated: new Date().toISOString(),
        _sha: currentSha // Include current SHA for reference
    };

    // Convert to base64
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    
    // Prepare the API payload
    const payload = {
        message: `Update shipping data - ${new Date().toLocaleString()}`,
        content: content,
        branch: BRANCH
    };

    // If we have a SHA, include it for update
    if (currentSha) {
        payload.sha = currentSha;
    }

    const response = await fetch(API_DATA_URL, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const result = await response.json();
    currentSha = result.content.sha; // Update SHA for next save
    
    showMessage('Data saved to cloud! ✅', 'success');
    saveToLocalStorage(); // Also save locally as backup
}

function saveToLocalStorage() {
    const data = {
        products: products,
        rates: rates,
        lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('shippingData', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('shippingData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            products = data.products || [];
            rates = data.rates || rates;
            
            updateRatesUI();
            renderProducts();
            updateTotals();
            showMessage('Loaded from local storage', 'info');
        } catch (error) {
            console.error('Local storage load failed:', error);
            showMessage('Starting with empty data', 'info');
        }
    } else {
        showMessage('Starting with new data', 'info');
    }
}

function updateRatesUI() {
    document.getElementById('cbmRate').value = rates.cbmRate;
    document.getElementById('dollarRate').value = rates.dollarRate;
    document.getElementById('yuanRate').value = rates.yuanRate;
}

function isGitHubConfigured() {
    return GITHUB_USERNAME && 
           GITHUB_USERNAME !== 'your-github-username' && 
           REPO_NAME && 
           REPO_NAME !== 'your-repo-name' && 
           GITHUB_TOKEN && 
           GITHUB_TOKEN !== 'your-token-here';
}

function showMessage(message, type = 'info') {
    // Remove existing message
    const existingMsg = document.getElementById('statusMessage');
    if (existingMsg) {
        existingMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.id = 'statusMessage';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 14px;
        ${type === 'success' ? 'background: #27ae60;' : ''}
        ${type === 'warning' ? 'background: #f39c12;' : ''}
        ${type === 'error' ? 'background: #e74c3c;' : ''}
        ${type === 'info' ? 'background: #3498db;' : ''}
    `;

    document.body.appendChild(messageDiv);

    // Auto remove after 4 seconds
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        messageDiv.style.transition = 'opacity 0.5s';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 500);
    }, 4000);
}

// Product management functions
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'index.html';
}

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
    renderProducts();
    saveData();
}

function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        products = products.filter(p => p.id !== id);
        renderProducts();
        updateTotals();
        saveData();
    }
}

function updateProduct(id, field, value) {
    const product = products.find(p => p.id === id);
    if (product) {
        const oldValue = product[field];
        product[field] = field === 'name' ? value : parseFloat(value) || 0;
        
        // Only save if value actually changed
        if (oldValue !== product[field]) {
            updateProductCalculations(id);
            updateTotals();
            saveData();
        }
    }
}

// Calculation functions
function calculateCBM(length, width, height) {
    return (length * width * height) / 1000000;
}

function calculateShippingCost(cbm) {
    return cbm * rates.cbmRate * rates.dollarRate;
}

function calculateProductCost(productCostYuan, localShippingYuan) {
    return (productCostYuan + localShippingYuan) * rates.yuanRate;
}

function updateProductCalculations(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const cbm = calculateCBM(product.length, product.width, product.height);
    const shippingCost = calculateShippingCost(cbm);
    const productCostCedis = calculateProductCost(product.productCost, product.localShipping);
    const totalCost = productCostCedis + shippingCost;
    
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
    
    if (products.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="12" style="text-align: center; padding: 40px; color: #666;">
                No products yet. Click "Add Product" to get started!
            </td>
        `;
        tbody.appendChild(emptyRow);
        return;
    }
    
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
                       placeholder="Product name" style="min-width: 120px;">
            </td>
            <td>
                <input type="number" class="input-cell" value="${product.length}" 
                       onchange="updateProduct(${product.id}, 'length', this.value)" step="0.1" min="0">
            </td>
            <td>
                <input type="number" class="input-cell" value="${product.width}" 
                       onchange="updateProduct(${product.id}, 'width', this.value)" step="0.1" min="0">
            </td>
            <td>
                <input type="number" class="input-cell" value="${product.height}" 
                       onchange="updateProduct(${product.id}, 'height', this.value)" step="0.1" min="0">
            </td>
            <td class="calc-cell cbm">${cbm.toFixed(6)}</td>
            <td>
                <input type="number" class="input-cell" value="${product.productCost}" 
                       onchange="updateProduct(${product.id}, 'productCost', this.value)" step="0.01" min="0">
            </td>
            <td>
                <input type="number" class="input-cell" value="${product.localShipping}" 
                       onchange="updateProduct(${product.id}, 'localShipping', this.value)" step="0.01" min="0">
            </td>
            <td class="calc-cell total-yuan">${(product.productCost + product.localShipping).toFixed(2)}</td>
            <td class="calc-cell product-cedis">${productCostCedis.toFixed(2)}</td>
            <td class="calc-cell shipping-cedis">${shippingCost.toFixed(2)}</td>
            <td class="calc-cell total-cedis">${totalCost.toFixed(2)}</td>
            <td>
                <button class="delete-btn" onclick="deleteProduct(${product.id})" title="Delete product">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Add this to check GitHub configuration on page load
document.addEventListener('DOMContentLoaded', function() {
    if (!isGitHubConfigured()) {
        showMessage('⚠️ GitHub not configured - data will be saved locally only', 'warning');
    }
});
