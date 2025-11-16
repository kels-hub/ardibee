// GitHub Configuration
const GITHUB_USERNAME = 'kels-hub'; // Replace with your GitHub username
const REPO_NAME = 'ardibee'; // Replace with your repository name
const GITHUB_TOKEN = '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'; // You'll create this once
const DATA_FILE_PATH = 'data/products.json';

const DATA_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/${DATA_FILE_PATH}`;
const API_URL = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${DATA_FILE_PATH}`;

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

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    const currentUser = localStorage.getItem('currentUser');
    document.getElementById('userWelcome').textContent = `Welcome, ${currentUser}!`;
    
    // Load data from GitHub
    await loadDataFromGitHub();
    
    // Setup event listeners
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('addProductBtn').addEventListener('click', addProduct);
    
    // Rate change listeners
    document.getElementById('cbmRate').addEventListener('input', function() {
        rates.cbmRate = parseFloat(this.value) || 0;
        updateAllCalculations();
        saveDataToGitHub();
    });
    
    document.getElementById('dollarRate').addEventListener('input', function() {
        rates.dollarRate = parseFloat(this.value) || 0;
        updateAllCalculations();
        saveDataToGitHub();
    });
    
    document.getElementById('yuanRate').addEventListener('input', function() {
        rates.yuanRate = parseFloat(this.value) || 0;
        updateAllCalculations();
        saveDataToGitHub();
    });
});

async function loadDataFromGitHub() {
    try {
        console.log('Loading data from GitHub...');
        const response = await fetch(DATA_URL + '?t=' + Date.now()); // Cache bust
        
        if (response.ok) {
            const data = await response.json();
            products = data.products || [];
            rates = data.rates || rates;
            
            // Update UI with loaded rates
            document.getElementById('cbmRate').value = rates.cbmRate;
            document.getElementById('dollarRate').value = rates.dollarRate;
            document.getElementById('yuanRate').value = rates.yuanRate;
            
            renderProducts();
            updateTotals();
            showMessage('Data loaded successfully!', 'success');
        } else {
            throw new Error('Failed to load data');
        }
    } catch (error) {
        console.warn('Could not load from GitHub, using local storage:', error);
        loadFromLocalStorage();
    }
}

async function saveDataToGitHub() {
    // If no token, save to local storage only
    if (!GITHUB_TOKEN || GITHUB_TOKEN === 'YOUR_GITHUB_TOKEN') {
        saveToLocalStorage();
        showMessage('Data saved locally (no GitHub token configured)', 'warning');
        return;
    }

    try {
        // First, get the current file to get its SHA
        const getResponse = await fetch(API_URL, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        let sha = '';
        if (getResponse.ok) {
            const fileData = await getResponse.json();
            sha = fileData.sha;
        }

        // Prepare the data
        const data = {
            products: products,
            rates: rates,
            lastUpdated: new Date().toISOString()
        };

        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        
        const updateResponse = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Update shipping data - ${new Date().toLocaleString()}`,
                content: content,
                sha: sha || undefined
            })
        });

        if (updateResponse.ok) {
            showMessage('Data saved to cloud! ✅', 'success');
            saveToLocalStorage(); // Also save locally as backup
        } else {
            throw new Error('GitHub API error');
        }
    } catch (error) {
        console.error('Failed to save to GitHub:', error);
        saveToLocalStorage();
        showMessage('Saved locally (cloud save failed)', 'warning');
    }
}

// Local storage fallback
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
        const data = JSON.parse(saved);
        products = data.products || [];
        rates = data.rates || rates;
        
        document.getElementById('cbmRate').value = rates.cbmRate;
        document.getElementById('dollarRate').value = rates.dollarRate;
        document.getElementById('yuanRate').value = rates.yuanRate;
        
        renderProducts();
        updateTotals();
        showMessage('Loaded from local storage', 'info');
    }
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
        padding: 10px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        transition: opacity 0.3s;
        ${type === 'success' ? 'background: #27ae60;' : ''}
        ${type === 'warning' ? 'background: #f39c12;' : ''}
        ${type === 'error' ? 'background: #e74c3c;' : ''}
        ${type === 'info' ? 'background: #3498db;' : ''}
    `;

    document.body.appendChild(messageDiv);

    // Auto remove after 3 seconds
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// Rest of your existing functions (slightly modified to auto-save)
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
    saveDataToGitHub(); // Auto-save
}

function deleteProduct(id) {
    products = products.filter(p => p.id !== id);
    renderProducts();
    updateTotals();
    saveDataToGitHub(); // Auto-save
}

function updateProduct(id, field, value) {
    const product = products.find(p => p.id === id);
    if (product) {
        product[field] = field === 'name' ? value : parseFloat(value) || 0;
        updateProductCalculations(id);
        updateTotals();
        saveDataToGitHub(); // Auto-save after short delay
    }
}

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


