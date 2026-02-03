// Laser Engraving File Converter - JavaScript

// Constants
const TOUCH_DEBOUNCE_MS = 100; // Delay to prevent double-triggering from touch-to-click events

let uploadedFile = null;
let uploadedFilename = null;
let outputFilename = null;
let uniqueId = null;
let multiFormatOutputs = {};
let touchHandled = false; // Flag to prevent double-triggering on mobile

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadBestPractices();
    setupEventListeners();
});

function setupEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const conversionMode = document.getElementById('conversionMode');
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop (with touch support)
    uploadArea.addEventListener('click', function(e) {
        // Only trigger if not from a touch event
        if (!touchHandled) {
            fileInput.click();
        }
        // Reset flag after a delay to handle touch-to-click sequence properly
        setTimeout(() => {
            touchHandled = false;
        }, TOUCH_DEBOUNCE_MS);
    });
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Add touch event handling for better mobile experience
    uploadArea.addEventListener('touchstart', function(e) {
        this.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('touchend', function(e) {
        this.classList.remove('drag-over');
        touchHandled = true; // Mark that touch was handled
        // Click event will still fire naturally, opening the file picker
    });
    
    // Conversion mode change
    if (conversionMode) {
        conversionMode.addEventListener('change', handleConversionModeChange);
    }
}

function handleConversionModeChange() {
    const mode = document.getElementById('conversionMode').value;
    const singleOptions = document.getElementById('singleFormatOptions');
    
    if (mode === 'single') {
        singleOptions.style.display = 'block';
    } else {
        singleOptions.style.display = 'none';
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        uploadFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        uploadFile(files[0]);
    }
}

function handleOutputTypeChange() {
    const outputType = document.getElementById('outputType').value;
    const dpiGroup = document.getElementById('dpiGroup');
    const thresholdGroup = document.getElementById('thresholdGroup');
    
    if (outputType === 'png') {
        dpiGroup.style.display = 'block';
    } else {
        dpiGroup.style.display = 'none';
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Show loading
    showLoading('Uploading file...');
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.error) {
            showAlert(data.error, 'error');
            hideLoading();
            return;
        }
        
        // Store file info
        uploadedFile = file;
        uploadedFilename = data.filename;
        
        // Update UI
        document.getElementById('fileName').textContent = data.original_filename;
        document.getElementById('fileType').textContent = data.file_type.toUpperCase();
        document.getElementById('fileInfo').style.display = 'block';
        document.getElementById('optionsSection').style.display = 'block';
        
        // Adjust options based on file type
        if (data.file_type === 'raster') {
            document.getElementById('thresholdGroup').style.display = 'none';
        }
        
        hideLoading();
        
        // Scroll to options
        document.getElementById('optionsSection').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        showAlert('Upload failed: ' + error.message, 'error');
        hideLoading();
    }
}

async function convertFile() {
    if (!uploadedFilename) {
        showAlert('Please upload a file first', 'error');
        return;
    }
    
    const conversionMode = document.getElementById('conversionMode').value;
    const useCase = document.getElementById('useCase').value;
    
    if (conversionMode === 'multi') {
        await convertFileMultiFormat(useCase);
    } else {
        await convertFileSingleFormat();
    }
}

async function convertFileMultiFormat(useCase) {
    // Show loading
    showLoading('Generating all formats...');
    document.getElementById('convertBtn').disabled = true;
    
    try {
        const response = await fetch('/api/convert-multi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: uploadedFilename,
                use_case: useCase
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            showAlert(data.error, 'error');
            hideLoading();
            document.getElementById('convertBtn').disabled = false;
            return;
        }
        
        // Store outputs
        multiFormatOutputs = data.outputs;
        uniqueId = uploadedFilename.split('_')[0];
        
        // Display all outputs
        displayMultiFormatOutputs(data.outputs);
        
        // Show results section
        document.getElementById('multiResultsSection').style.display = 'block';
        hideLoading();
        document.getElementById('convertBtn').disabled = false;
        
        // Scroll to results
        document.getElementById('multiResultsSection').scrollIntoView({ behavior: 'smooth' });
        
        showAlert(`Successfully generated ${Object.keys(data.outputs).length} formats!`, 'success');
        
    } catch (error) {
        showAlert('Conversion failed: ' + error.message, 'error');
        hideLoading();
        document.getElementById('convertBtn').disabled = false;
    }
}

function displayMultiFormatOutputs(outputs) {
    const grid = document.getElementById('outputsGrid');
    grid.innerHTML = '';
    
    for (const [key, output] of Object.entries(outputs)) {
        const card = document.createElement('div');
        card.className = 'output-card';
        card.innerHTML = `
            <h3>${output.format}</h3>
            <p>${output.description}</p>
            <p><strong>Size:</strong> ${output.file_size_mb} MB</p>
            <p class="specs"><strong>Material:</strong> ${output.material_suggestion}</p>
            <button class="btn btn-primary" onclick="downloadSingleFormat('${output.filename}')">
                ⬇ DOWNLOAD
            </button>
        `;
        grid.appendChild(card);
    }
}

function downloadSingleFormat(filename) {
    window.location.href = '/api/download/' + filename;
    showAlert('Downloading ' + filename, 'success');
}

function downloadAllFiles() {
    if (!uniqueId) {
        showAlert('No files to download', 'error');
        return;
    }
    
    showAlert('Preparing ZIP file...', 'success');
    window.location.href = '/api/download-all/' + uniqueId;
    
    setTimeout(() => {
        showAlert('ZIP file downloaded to your Downloads folder!', 'success');
    }, 1000);
}

async function convertFileSingleFormat() {
    const outputType = document.getElementById('outputType').value;
    const dpi = document.getElementById('dpi').value;
    const threshold = document.getElementById('threshold') ? document.getElementById('threshold').value : 128;
    const useCase = document.getElementById('useCase').value;
    
    // Show loading
    showLoading('Converting file...');
    document.getElementById('convertBtn').disabled = true;
    
    try {
        const response = await fetch('/api/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: uploadedFilename,
                output_type: outputType,
                dpi: dpi,
                threshold: threshold,
                use_case: useCase
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            showAlert(data.error, 'error');
            hideLoading();
            document.getElementById('convertBtn').disabled = false;
            return;
        }
        
        // Store output filename
        outputFilename = data.output_filename;
        
        // Update results
        document.getElementById('outputFileName').textContent = data.output_filename;
        document.getElementById('fileSize').textContent = data.file_size_mb + ' MB';
        document.getElementById('materialSuggestion').textContent = data.material_suggestion;
        
        // Show results section
        document.getElementById('resultsSection').style.display = 'block';
        hideLoading();
        document.getElementById('convertBtn').disabled = false;
        
        // Scroll to results
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
        
        showAlert('Conversion successful! File ready for download.', 'success');
        
    } catch (error) {
        showAlert('Conversion failed: ' + error.message, 'error');
        hideLoading();
        document.getElementById('convertBtn').disabled = false;
    }
}

function downloadFile() {
    if (!outputFilename) {
        showAlert('No file to download', 'error');
        return;
    }
    
    // Show feedback
    showAlert('Starting download...', 'success');
    
    // Create a temporary link element to trigger download
    const downloadUrl = '/api/download/' + outputFilename;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = ''; // Let the server suggest the filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message after a short delay
    setTimeout(() => {
        showAlert('File downloaded to your Downloads folder!', 'success');
    }, 500);
}

function resetForm() {
    // Reset variables
    uploadedFile = null;
    uploadedFilename = null;
    outputFilename = null;
    uniqueId = null;
    multiFormatOutputs = {};
    
    // Reset form
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('optionsSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('multiResultsSection').style.display = 'none';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadBestPractices() {
    try {
        const response = await fetch('/api/best-practices');
        const data = await response.json();
        
        const list = document.getElementById('practicesList');
        list.innerHTML = '';
        
        data.practices.forEach(practice => {
            const li = document.createElement('li');
            li.textContent = practice;
            list.appendChild(li);
        });
    } catch (error) {
        console.error('Failed to load best practices:', error);
    }
}

function toggleBestPractices() {
    const list = document.getElementById('bestPracticesList');
    const button = event.target;
    
    if (list.style.display === 'none') {
        list.style.display = 'block';
        button.textContent = 'Hide Best Practices';
    } else {
        list.style.display = 'none';
        button.textContent = 'Show Best Practices';
    }
}

function showLoading(message) {
    const loading = document.getElementById('loadingIndicator');
    if (message) {
        loading.querySelector('p').textContent = message;
    }
    loading.style.display = 'block';
}

function hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
}

function showAlert(message, type) {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    // Insert at top of main section
    const main = document.querySelector('main');
    main.insertBefore(alert, main.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
    
    // Scroll to alert
    alert.scrollIntoView({ behavior: 'smooth' });
}

// ============================================================================
// MACHINE CONTROL FUNCTIONS
// ============================================================================

let connectedMachinePort = null;
let currentOutputFilename = null;

async function scanForMachines() {
    showLoading('Scanning for machines...');
    
    try {
        const response = await fetch('/api/machines/scan');
        const data = await response.json();
        
        hideLoading();
        
        if (data.success && data.machines.length > 0) {
            displayMachines(data.machines);
            showAlert(`Found ${data.machines.length} machine(s)!`, 'success');
        } else {
            showAlert('No machines found. Make sure your laser engraver is connected via USB.', 'warning');
        }
    } catch (error) {
        hideLoading();
        showAlert('Error scanning for machines: ' + error.message, 'error');
    }
}

function displayMachines(machines) {
    const machinesList = document.getElementById('machinesList');
    machinesList.innerHTML = '';
    
    machines.forEach(machine => {
        const machineCard = document.createElement('div');
        machineCard.className = 'machine-card';
        machineCard.innerHTML = `
            <div class="machine-card-header">
                <strong>${machine.name}</strong>
                <span class="machine-type">${machine.machine_type}</span>
            </div>
            <div class="machine-card-body">
                <p><strong>Port:</strong> ${machine.port}</p>
                <p><strong>Description:</strong> ${machine.description}</p>
                ${machine.serial_number ? `<p><strong>Serial:</strong> ${machine.serial_number}</p>` : ''}
            </div>
            <button class="btn btn-primary" onclick="connectToMachine('${machine.port}')">
                🔌 CONNECT
            </button>
        `;
        machinesList.appendChild(machineCard);
    });
    
    machinesList.style.display = 'block';
}

async function connectToMachine(port) {
    showLoading('Connecting to machine...');
    
    try {
        const response = await fetch('/api/machines/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ port: port, baudrate: 115200 })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            connectedMachinePort = port;
            showConnectedMachine(port);
            showAlert('Connected successfully!', 'success');
            
            // Start status monitoring
            startStatusMonitoring();
        } else {
            showAlert('Failed to connect: ' + data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showAlert('Connection error: ' + error.message, 'error');
    }
}

function showConnectedMachine(port) {
    // Hide machines list and scan button
    document.getElementById('machinesList').style.display = 'none';
    document.getElementById('scanMachinesBtn').style.display = 'none';
    
    // Show connected machine section
    const connectedSection = document.getElementById('connectedMachine');
    connectedSection.style.display = 'block';
    
    document.getElementById('connectedMachineName').textContent = 'Laser Engraver';
    document.getElementById('connectedMachinePort').textContent = port;
    
    // Enable send-to-machine if file is ready
    if (currentOutputFilename) {
        document.getElementById('sendToMachineSection').style.display = 'block';
    }
}

async function disconnectMachine() {
    showLoading('Disconnecting...');
    
    try {
        const response = await fetch('/api/machines/disconnect', {
            method: 'POST'
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            connectedMachinePort = null;
            hideConnectedMachine();
            showAlert('Disconnected successfully', 'info');
        }
    } catch (error) {
        hideLoading();
        showAlert('Disconnect error: ' + error.message, 'error');
    }
}

function hideConnectedMachine() {
    document.getElementById('connectedMachine').style.display = 'none';
    document.getElementById('scanMachinesBtn').style.display = 'block';
    document.getElementById('sendToMachineSection').style.display = 'none';
    document.getElementById('controlButtons').style.display = 'none';
}

async function sendToMachine() {
    if (!currentOutputFilename) {
        showAlert('No file ready. Please convert a file first.', 'warning');
        return;
    }
    
    if (!connectedMachinePort) {
        showAlert('No machine connected. Please connect first.', 'warning');
        return;
    }
    
    // Get settings
    const power = parseInt(document.getElementById('laserPower').value);
    const speed = parseInt(document.getElementById('laserSpeed').value);
    const workWidth = parseInt(document.getElementById('workWidth').value);
    const workHeight = parseInt(document.getElementById('workHeight').value);
    
    showLoading('Generating G-code and sending to machine...');
    
    try {
        const response = await fetch('/api/machines/send-gcode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: currentOutputFilename,
                power: power,
                speed: speed,
                work_area: [workWidth, workHeight]
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showAlert('G-code sent to machine! Engraving started.', 'success');
            document.getElementById('controlButtons').style.display = 'block';
        } else {
            showAlert('Failed to send: ' + data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showAlert('Send error: ' + error.message, 'error');
    }
}

async function controlMachine(action) {
    showLoading(`Executing ${action}...`);
    
    try {
        const response = await fetch('/api/machines/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showAlert(`${action.toUpperCase()} executed successfully`, 'success');
        } else {
            showAlert('Control failed: ' + data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showAlert('Control error: ' + error.message, 'error');
    }
}

let statusMonitorInterval = null;

function startStatusMonitoring() {
    // Update machine status every 2 seconds
    statusMonitorInterval = setInterval(updateMachineStatus, 2000);
}

function stopStatusMonitoring() {
    if (statusMonitorInterval) {
        clearInterval(statusMonitorInterval);
        statusMonitorInterval = null;
    }
}

async function updateMachineStatus() {
    try {
        const response = await fetch('/api/machines/status');
        const data = await response.json();
        
        if (data.success) {
            const indicator = document.getElementById('statusIndicator');
            const statusText = document.getElementById('machineStatusText');
            
            // Update status display
            statusText.textContent = data.status.toUpperCase();
            
            // Update indicator color
            indicator.className = 'status-indicator';
            if (data.status === 'idle') {
                indicator.classList.add('status-idle');
            } else if (data.status === 'running') {
                indicator.classList.add('status-running');
            } else if (data.status === 'paused') {
                indicator.classList.add('status-paused');
            } else if (data.status === 'error' || data.status === 'alarm') {
                indicator.classList.add('status-error');
            }
            
            if (!data.connected) {
                stopStatusMonitoring();
                hideConnectedMachine();
            }
        }
    } catch (error) {
        // Silently fail - machine might be disconnected
        stopStatusMonitoring();
    }
}

// Update the convertFile function to store the output filename
const originalConvertFile = convertFile;
convertFile = async function() {
    await originalConvertFile();
    
    // After conversion, enable send-to-machine if connected
    setTimeout(() => {
        const outputFileName = document.getElementById('outputFileName');
        if (outputFileName && outputFileName.textContent) {
            currentOutputFilename = outputFileName.textContent;
            if (connectedMachinePort) {
                document.getElementById('sendToMachineSection').style.display = 'block';
            }
        }
    }, 500);
};

// For multi-format, use the first SVG or PNG file
function enableMachineSendForMultiFormat(outputs) {
    if (outputs && outputs.length > 0) {
        // Prefer SVG, then PNG
        const svgFile = outputs.find(o => o.format === 'svg');
        const pngFile = outputs.find(o => o.format === 'png');
        
        currentOutputFilename = svgFile ? svgFile.filename : (pngFile ? pngFile.filename : outputs[0].filename);
        
        if (connectedMachinePort) {
            document.getElementById('sendToMachineSection').style.display = 'block';
        }
    }
}

