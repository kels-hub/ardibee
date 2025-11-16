// Check authentication
if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'index.html';
}

let products = [];

document.addEventListener('DOMContentLoaded', function() {
    const currentUser = localStorage.getItem('currentUser');
    document.getElementById('userWelcome').textContent = `Welcome, ${currentUser}!`;
    
    // Load data from URL or local storage
    loadFromURL();
    
    // Event listeners
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('addProductBtn').addEventListener('click', addProduct);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importInput').addEventListener('change', importData);
    document.getElementById('shareBtn').addEventListener('click', openShareModal);
    
    // Rate change listeners
    document.getElementById('cbmRate').addEventListener('input', updateAllCalculations);
    document.getElementById('dollarRate').addEventListener('input', updateAllCalculations);
    document.getElementById('yuanRate').addEventListener('input', updateAllCalculations);
});

// URL Data Storage Functions
function saveToURL() {
    const data = {
        products: products,
        rates: {
            cbm: document.getElementById('cbmRate').value,
            dollar: document.getElementById('dollarRate').value,
            yuan: document.getElementById('yuanRate').value
        },
        timestamp: new Date().toISOString()
    };
    
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(data));
    const newURL = window.location.origin + window.location.pathname + '?data=' + compressed;
    window.history.replaceState(null, '', newURL);
    
    // Also save to local storage as backup
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem('rates', JSON.stringify(data.rates));
}

function loadFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    
    if (dataParam) {
        try {
            const decompressed = LZString.decompressFromEncodedURIComponent(dataParam);
            const data = JSON.parse(decompressed);
            
            products = data.products || [];
            document.getElementById('cbmRate').value = data.rates?.cbm || 247;
            document.getElementById('dollarRate').value = data.rates?.dollar || 15;
            document.getElementById('yuanRate').value = data.rates?.yuan || 0.575;
            
            renderProducts();
            updateTotals();
            console.log('Data loaded from URL');
            return;
        } catch (error) {
            console.error('Error loading from URL:', error);
        }
    }
    
    // Fallback to local storage
    loadFromLocalStorage();
}

function loadFromLocalStorage() {
    products = JSON.parse(localStorage.getItem('products')) || [];
    const savedRates = JSON.parse(localStorage.getItem('rates'));
    
    if (savedRates) {
        document.getElementById('cbmRate').value = savedRates.cbm || 247;
        document.getElementById('dollarRate').value = savedRates.dollar || 15;
        document.getElementById('yuanRate').value = savedRates.yuan || 0.575;
    }
    
    renderProducts();
    updateTotals();
}

// Share Modal Functions
function openShareModal() {
    saveToURL(); // Ensure URL is up to date
    const currentURL = window.location.href;
    
    document.getElementById('shareUrl').value = currentURL;
    document.getElementById('shareModal').style.display = 'flex';
    
    // Generate QR code
    generateQRCode(currentURL);
}

function closeShareModal() {
    document.getElementById('shareModal').style.display = 'none';
}

function copyShareUrl() {
    const shareUrl = document.getElementById('shareUrl');
    shareUrl.select();
    shareUrl.setSelectionRange(0, 99999);
    document.execCommand('copy');
    
    // Show copied feedback
    const copyBtn = document.querySelector('.copy-btn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    copyBtn.style.background = '#27ae60';
    
    setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = '#3498db';
    }, 2000);
}

function generateQRCode(text) {
    const qrcodeContainer = document.getElementById('qrcode');
    qrcodeContainer.innerHTML = '';
    
    // Simple QR code generation using canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    
    // Simple QR-like pattern (for demo - in production use a proper QR library)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'black';
    
    // Create a simple pattern
    for (let i = 0; i < size; i += 10) {
        for (let j = 0; j < size; j += 10) {
            if (Math.random() > 0.5) {
                ctx.fillRect(i, j, 8, 8);
            }
        }
    }
    
    qrcodeContainer.appendChild(canvas);
}

function shareViaWhatsApp() {
    const url = encodeURIComponent(document.getElementById('shareUrl').value);
    window.open(`https://wa.me/?text=${url}`, '_blank');
}

function shareViaEmail() {
    const url = document.getElementById('shareUrl').value;
    window.open(`mailto:?subject=Shipping Calculator Data&body=Here is my shipping data: ${url}`, '_blank');
}

function shareViaSMS() {
    const url = document.getElementById('shareUrl').value;
    window.open(`sms:?body=Shipping Calculator Data: ${url}`, '_blank');
}

// File Export/Import
function exportData() {
    const data = {
        products: products,
        rates: {
            cbm: document.getElementById('cbmRate').value,
            dollar: document.getElementById('dollarRate').value,
            yuan: document.getElementById('yuanRate').value
        },
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipping-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            products = data.products || [];
            document.getElementById('cbmRate').value = data.rates?.cbm || 247;
            document.getElementById('dollarRate').value = data.rates?.dollar || 15;
            document.getElementById('yuanRate').value = data.rates?.yuan || 0.575;
            
            renderProducts();
            updateTotals();
            saveToURL();
            
            alert('Data imported successfully!');
        } catch (error) {
            alert('Error importing file. Please check the file format.');
        }
    };
    reader.readAsText(file);
}

// Product Management
async function addProduct() {
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
    saveToURL();
    renderProducts();
}

async function deleteProduct(id) {
    products = products.filter(p => p.id !== id);
    saveToURL();
    renderProducts();
    updateTotals();
}

async function updateProduct(id, field, value) {
    const product = products.find(p => p.id === id);
    if (product) {
        product[field] = field === 'name' ? value : parseFloat(value) || 0;
        saveToURL();
        updateProductCalculations(id);
        updateTotals();
    }
}

// Calculation Functions
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
    saveToURL(); // Auto-save when rates change
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

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'index.html';
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('shareModal');
    if (event.target === modal) {
        closeShareModal();
    }
});
