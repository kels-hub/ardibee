// GitHub Configuration - UPDATE THESE WITH YOUR ACTUAL INFO!
const GITHUB_CONFIG = {
    username: 'kels-hub',      // Replace with your actual GitHub username
    repo: 'ardibee',                // Replace with your actual repository name
    token: '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',            // Replace with your actual token
    branch: 'main'
};

// URLs
const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/data/products.json`;
const API_URL = `https://api.github.com/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/data/products.json`;

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
let currentSha = '';

document.addEventListener('DOMContentLoaded', async function() {
    const currentUser = localStorage.getItem('currentUser');
    document.getElementById('userWelcome').textContent = `Welcome, ${currentUser}!`;
    
    setupEventListeners();
    await loadData();
});

function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('addProductBtn').addEventListener('click', addProduct);
    
    let saveTimeout;
    const scheduleSave = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => saveData(), 1500);
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
    
    if (!isGitHubConfigured()) {
        showMessage('GitHub not configured - using local storage', 'warning');
        loadFromLocalStorage();
        return;
    }
    
    try {
        await loadFromGitHub();
    } catch (error) {
        console.error('GitHub load failed:', error);
        showMessage(`Cloud load failed: ${error.message}`, 'error');
        loadFromLocalStorage();
    }
}

async function loadFromGitHub() {
    console.log('Loading from GitHub...', RAW_URL);
    
    const response = await fetch(RAW_URL + '?t=' + Date.now());
    
    if (!response.ok) {
        throw new Error(`Failed to load: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Loaded data:', data);
    
    // Validate and update data
    if (data && typeof data === 'object') {
        products = Array.isArray(data.products) ? data.products : [];
        rates = data.rates && typeof data.rates === 'object' ? { ...rates, ...data.rates } : rates;
        
        updateRatesUI();
        renderProducts();
        updateTotals();
        
        showMessage('Data loaded from cloud! ✅', 'success');
    } else {
        throw new Error('Invalid data format from server');
    }
}

async function saveData() {
    if (!isGitHubConfigured()) {
        saveToLocalStorage();
        return;
    }

    try {
        await saveToGitHub();
    } catch (error) {
        console.error('Save failed:', error);
        saveToLocalStorage();
        showMessage(`Cloud save failed: ${error.message}`, 'error');
    }
}

async function saveToGitHub() {
    console.log('Saving to GitHub...');
    
    // First, try to get the current file to get its SHA
    let sha = '';
    try {
        const getResponse = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (getResponse.ok) {
            const fileInfo = await getResponse.json();
            sha = fileInfo.sha;
            console.log('Got file SHA:', sha);
        } else if (getResponse.status !== 404) {
            // 404 is okay - file doesn't exist yet
            throw new Error(`Failed to get file info: ${getResponse.status}`);
        }
    } catch (error) {
        console.warn('Could not get file info:', error);
    }

    // Prepare data
    const data = {
        products: products,
        rates: rates,
        lastUpdated: new Date().toISOString()
    };

    // Convert to base64
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    console.log('Content prepared, length:', content.length);

    // Prepare payload
    const payload = {
        message: `Update shipping data - ${new Date().toLocaleString()}`,
        content: content,
        branch: GITHUB_CONFIG.branch
    };

    // Include SHA if we have it (for updates)
    if (sha) {
        payload.sha = sha;
    }

    console.log('Sending payload:', { ...payload, content: '[BASE64_CONTENT]' });

    const response = await fetch(API_URL, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${GITHUB_CONFIG.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(payload)
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('GitHub API error response:', errorText);
        
        let errorMessage = `GitHub API error: ${response.status}`;
        try {
            const errorData = JSON.parse(errorText);
            errorMessage += ` - ${errorData.message || 'Unknown error'}`;
        } catch (e) {
            errorMessage += ` - ${errorText}`;
        }
        
        throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Save successful:', result);
    
    showMessage('Data saved to cloud! ✅', 'success');
    saveToLocalStorage(); // Backup to local storage
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
    }
}

function updateRatesUI() {
    document.getElementById('cbmRate').value = rates.cbmRate;
    document.getElementById('dollarRate').value = rates.dollarRate;
    document.getElementById('yuanRate').value = rates.yuanRate;
}

function isGitHubConfigured() {
    const config = GITHUB_CONFIG;
    return config.username && 
           config.username !== 'YOUR_GITHUB_USERNAME' &&
           config.repo && 
           config.repo !== 'YOUR_REPO_NAME' &&
           config.token && 
           config.token !== 'YOUR_GITHUB_TOKEN' &&
           config.token.length > 20; // Basic token length check
}

function showMessage(message, type = 'info') {
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
        
        if (oldValue !== product[field]) {
            updateProductCalculations(id);
            updateTotals();
            saveData();
        }
    }
}

// Calculation functions (keep the same as before)
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

// Add configuration check on load
document.addEventListener('DOMContentLoaded', function() {
    if (!isGitHubConfigured()) {
        showMessage('⚠️ GitHub not configured - data will be saved locally only. Check console for setup instructions.', 'warning');
        console.log(`
🚨 GITHUB SETUP REQUIRED 🚨

To enable cloud saving, please update these values in dashboard.js:

const GITHUB_CONFIG = {
    username: 'your-actual-github-username',   // Your GitHub username
    repo: 'your-actual-repo-name',             // Your repository name  
    token: 'ghp_yourActualTokenHere',          // Your GitHub token
    branch: 'main'
};

📝 How to get your token:
1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name it "Shipping App", set to "No expiration"
4. Check ✅ "repo" permission
5. Copy the token (starts with ghp_)
6. Paste it in the config above

Your data will work locally until you set this up!
        `);
    }
});
