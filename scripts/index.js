// WinHex File Analyzer - Supports Hex, Binary, and Octal views

let fileData = null; // Store file bytes globally
let currentMode = 'hex'; // Default view mode
let currentPage = 1;
const BYTES_PER_ROW = 16;
const ROWS_PER_PAGE = 32;
const BYTES_PER_PAGE = BYTES_PER_ROW * ROWS_PER_PAGE;

// Format a single byte based on mode
function formatByte(byte, mode) {
    switch (mode) {
        case 'binary':
            return byte.toString(2).padStart(8, '0');
        case 'octal':
            return byte.toString(8).padStart(3, '0');
        case 'hex':
        default:
            return byte.toString(16).toUpperCase().padStart(2, '0');
    }
}

// Convert byte to printable ASCII character
function toAscii(byte) {
    return (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
}

// Generate table rows for current page
function generateTableRows(bytes, mode, page, bytesPerPage) {
    const rows = [];
    const startByte = (page - 1) * bytesPerPage;
    const endByte = Math.min(startByte + bytesPerPage, bytes.length);
    const pageBytes = bytes.slice(startByte, endByte);
    const totalRows = Math.ceil(pageBytes.length / BYTES_PER_ROW);

    for (let i = 0; i < totalRows; i++) {
        const rowStart = i * BYTES_PER_ROW;
        const globalOffset = startByte + rowStart;
        const rowBytes = pageBytes.slice(rowStart, rowStart + BYTES_PER_ROW);
        
        // Format offset
        const offsetStr = globalOffset.toString(16).toUpperCase().padStart(8, '0');
        
        // Format data bytes
        let dataStr = '';
        let asciiStr = '';
        
        rowBytes.forEach((byte, idx) => {
            dataStr += formatByte(byte, mode);
            if (idx < rowBytes.length - 1) dataStr += ' ';
            asciiStr += toAscii(byte);
        });

        // Pad incomplete rows
        const missing = BYTES_PER_ROW - rowBytes.length;
        if (missing > 0) {
            const padLength = mode === 'binary' ? 8 : (mode === 'octal' ? 3 : 2);
            for (let j = 0; j < missing; j++) {
                dataStr += ' ' + ' '.repeat(padLength);
            }
        }

        rows.push({ offset: offsetStr, data: dataStr, ascii: asciiStr });
    }

    return rows;
}

// Update the display
function updateView() {
    const tbody = document.getElementById("dataView");
    
    if (!fileData) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-12 text-center text-slate-500">Select a file to see its contents...</td></tr>';
        updatePagination();
        return;
    }

    const rows = generateTableRows(fileData, currentMode, currentPage, BYTES_PER_PAGE);
    
    let html = '';
    rows.forEach((row, idx) => {
        const bgClass = idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/60';
        html += `<tr class="${bgClass} hover:bg-slate-700/50 transition-colors">
            <td class="px-4 py-1.5 text-slate-500 border-r border-slate-700 font-medium">${row.offset}</td>
            <td class="px-4 py-1.5 text-slate-300 border-r border-slate-700 whitespace-nowrap tracking-wider">${row.data}</td>
            <td class="px-4 py-1.5 text-indigo-400 tracking-wide">${escapeHtml(row.ascii)}</td>
        </tr>`;
    });
    
    tbody.innerHTML = html;

    // Update title based on mode
    const titles = {
        'hex': 'Hexadecimal View',
        'binary': 'Binary View',
        'octal': 'Octal View'
    };
    document.getElementById("viewTitle").textContent = titles[currentMode];
    
    updatePagination();
}

// Escape HTML special characters
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update button styles
function updateButtonStyles(activeMode) {
    const buttons = document.querySelectorAll('.view-btn');

    buttons.forEach(btn => {
        const mode = btn.dataset.mode;
        btn.classList.remove('bg-indigo-600', 'border-indigo-500', 'bg-slate-700', 'border-slate-600');
        
        if (mode === activeMode) {
            btn.classList.add('bg-indigo-600', 'border-indigo-500');
        } else {
            btn.classList.add('bg-slate-700', 'border-slate-600');
        }
    });
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get total pages
function getTotalPages() {
    if (!fileData) return 1;
    return Math.ceil(fileData.length / BYTES_PER_PAGE);
}

// Update pagination controls
function updatePagination() {
    const totalPages = getTotalPages();
    const btnPrev = document.getElementById("btnPrevious");
    const btnNext = document.getElementById("btnNext");
    const pageInfo = document.getElementById("pageInfo");

    btnPrev.disabled = currentPage <= 1;
    btnNext.disabled = currentPage >= totalPages;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

document.getElementById("fileInput").addEventListener("change", function (event) {
    event.preventDefault();
    const file = event.target.files[0];
    
    if (!file) return;

    // Display file info
    document.getElementById("fileInfo").classList.remove("hidden");
    document.getElementById("fileName").textContent = file.name;
    document.getElementById("fileSize").textContent = formatFileSize(file.size);
    document.getElementById("fileType").textContent = file.type || 'Unknown';

    // Read file
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
        fileData = new Uint8Array(e.target.result);
        currentPage = 1; // Reset to first page
        document.getElementById("byteCount").textContent = `${fileData.length} bytes`;
        updateView();
    };
    fileReader.readAsArrayBuffer(file);
});

// View mode button click handlers
document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        currentMode = this.dataset.mode;
        updateButtonStyles(currentMode);
        updateView();
    });
});

// Pagination button handlers
document.getElementById("btnPrevious").addEventListener("click", function() {
    if (currentPage > 1) {
        currentPage--;
        updateView();
    }
});

document.getElementById("btnNext").addEventListener("click", function() {
    if (currentPage < getTotalPages()) {
        currentPage++;
        updateView();
    }
});

// Initialize
updateButtonStyles('hex');
updatePagination();