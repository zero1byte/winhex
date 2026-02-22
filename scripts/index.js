// HexWood File Analyzer - Supports Hex, Binary, and Octal views

let fileData = null; // Store file bytes globally
let currentMode = 'hex'; // Default view mode
let currentPage = 1;
const BYTES_PER_ROW = 16;
let bytesPerPage = 512; // Default bytes per page (configurable)

// Search state
let searchMatches = []; // Array of byte offsets where matches start
let currentMatchIndex = -1;
let searchHighlightRanges = []; // Array of {start, end} for highlighting

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

// Check if byte is printable ASCII
function isPrintable(byte) {
    return (byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13; // Include tab, newline, carriage return
}

// Extract printable strings from file data (minimum length 4)
function extractStrings(bytes, minLength = 4) {
    const strings = [];
    let currentString = '';
    let startOffset = 0;
    
    for (let i = 0; i < bytes.length; i++) {
        if (isPrintable(bytes[i])) {
            if (currentString.length === 0) {
                startOffset = i;
            }
            currentString += String.fromCharCode(bytes[i]);
        } else {
            if (currentString.length >= minLength) {
                strings.push({
                    offset: startOffset,
                    text: currentString.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t')
                });
            }
            currentString = '';
        }
    }
    
    // Don't forget the last string if file ends with printable chars
    if (currentString.length >= minLength) {
        strings.push({
            offset: startOffset,
            text: currentString.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t')
        });
    }
    
    return strings;
}

// Get total strings pages
function getTotalStringsPages() {
    if (!fileData) return 1;
    const strings = extractStrings(fileData);
    const stringsPerPage = 50; // Show 50 strings per page
    return Math.max(1, Math.ceil(strings.length / stringsPerPage));
}

// Check if a byte offset is within any highlight range
function isHighlighted(offset) {
    return searchHighlightRanges.some(range => offset >= range.start && offset < range.end);
}

// Check if offset is the current match start
function isCurrentMatch(offset) {
    if (currentMatchIndex < 0 || currentMatchIndex >= searchMatches.length) return false;
    const matchStart = searchMatches[currentMatchIndex];
    const range = searchHighlightRanges.find(r => r.start === matchStart);
    return range && offset >= range.start && offset < range.end;
}

// Generate table rows for current page
function generateTableRows(bytes, mode, page, pageBytesCount) {
    const rows = [];
    const startByte = (page - 1) * pageBytesCount;
    const endByte = Math.min(startByte + pageBytesCount, bytes.length);
    const pageBytes = bytes.slice(startByte, endByte);
    const totalRows = Math.ceil(pageBytes.length / BYTES_PER_ROW);

    for (let i = 0; i < totalRows; i++) {
        const rowStart = i * BYTES_PER_ROW;
        const globalOffset = startByte + rowStart;
        const rowBytes = pageBytes.slice(rowStart, rowStart + BYTES_PER_ROW);

        // Format offset
        const offsetStr = globalOffset.toString(16).toUpperCase().padStart(8, '0');

        // Format data bytes with highlighting
        let dataStr = '';
        let asciiStr = '';

        rowBytes.forEach((byte, idx) => {
            const byteOffset = globalOffset + idx;
            const formatted = formatByte(byte, mode);
            const asciiChar = escapeHtml(toAscii(byte));
            
            if (isCurrentMatch(byteOffset)) {
                dataStr += `<span class="bg-yellow-500 text-slate-900 rounded px-0.5">${formatted}</span>`;
                asciiStr += `<span class="bg-yellow-500 text-slate-900 rounded">${asciiChar}</span>`;
            } else if (isHighlighted(byteOffset)) {
                dataStr += `<span class="bg-indigo-500/50 rounded px-0.5">${formatted}</span>`;
                asciiStr += `<span class="bg-indigo-500/50 rounded">${asciiChar}</span>`;
            } else {
                dataStr += formatted;
                asciiStr += asciiChar;
            }
            
            if (idx < rowBytes.length - 1) dataStr += ' ';
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
    const dataBody = document.getElementById("dataView");
    const asciiBody = document.getElementById("asciiView");

    if (!fileData) {
        dataBody.innerHTML = '<tr><td colspan="2" class="px-4 py-12 text-center text-slate-500">Select a file to see its contents...</td></tr>';
        asciiBody.innerHTML = '';
        updatePagination();
        return;
    }

    // Handle strings mode separately
    if (currentMode === 'strings') {
        updateStringsView();
        return;
    }

    const rows = generateTableRows(fileData, currentMode, currentPage, bytesPerPage);

    let dataHtml = '';
    let asciiHtml = '';
    rows.forEach((row, idx) => {
        const bgClass = idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/60';
        dataHtml += `<tr class="${bgClass} hover:bg-slate-700/50 transition-colors">
            <td class="px-4 py-1.5 text-slate-500 border-r border-slate-700 font-medium whitespace-nowrap">${row.offset}</td>
            <td class="px-4 py-1.5 text-slate-300 whitespace-nowrap tracking-wider">${row.data}</td>
        </tr>`;
        asciiHtml += `<tr class="${bgClass} hover:bg-slate-700/50 transition-colors">
            <td class="px-4 py-1.5 tracking-wide">${row.ascii}</td>
        </tr>`;
    });

    dataBody.innerHTML = dataHtml;
    asciiBody.innerHTML = asciiHtml;

    // Update title based on mode
    const titles = {
        'hex': 'Hexadecimal View',
        'binary': 'Binary View',
        'octal': 'Octal View',
        'strings': 'Strings View'
    };
    document.getElementById("viewTitle").textContent = titles[currentMode];

    updatePagination();
}

// Update strings view
function updateStringsView() {
    const dataBody = document.getElementById("dataView");
    const asciiBody = document.getElementById("asciiView");
    
    const allStrings = extractStrings(fileData);
    const stringsPerPage = 50;
    const startIdx = (currentPage - 1) * stringsPerPage;
    const endIdx = Math.min(startIdx + stringsPerPage, allStrings.length);
    const pageStrings = allStrings.slice(startIdx, endIdx);
    
    let dataHtml = '';
    let asciiHtml = '';
    
    if (pageStrings.length === 0) {
        dataHtml = '<tr><td colspan="2" class="px-4 py-12 text-center text-slate-500">No printable strings found (min length: 4 chars)</td></tr>';
    } else {
        pageStrings.forEach((str, idx) => {
            const bgClass = idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/60';
            const offsetStr = str.offset.toString(16).toUpperCase().padStart(8, '0');
            const displayText = escapeHtml(str.text);
            dataHtml += `<tr class="${bgClass} hover:bg-slate-700/50 transition-colors">
                <td class="px-4 py-1.5 text-slate-500 border-r border-slate-700 font-medium whitespace-nowrap align-top">${offsetStr}</td>
                <td class="px-4 py-1.5 text-green-400 tracking-wider break-all" style="word-break: break-word; white-space: pre-wrap;">${displayText}</td>
            </tr>`;
            asciiHtml += `<tr class="${bgClass} hover:bg-slate-700/50 transition-colors">
                <td class="px-4 py-1.5 text-slate-500 text-xs align-top">${str.text.length} chars</td>
            </tr>`;
        });
    }
    
    dataBody.innerHTML = dataHtml;
    asciiBody.innerHTML = asciiHtml;
    
    document.getElementById("viewTitle").textContent = 'Strings View';
    document.getElementById("byteCount").textContent = `${allStrings.length} strings found`;
    
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
    if (currentMode === 'strings') {
        return getTotalStringsPages();
    }
    return Math.ceil(fileData.length / bytesPerPage);
}

// Search functions
function parseHexInput(input) {
    // Parse hex string like "4D 5A" or "4D5A" into byte array
    const cleaned = input.replace(/[^0-9A-Fa-f]/g, '');
    const bytes = [];
    for (let i = 0; i < cleaned.length; i += 2) {
        if (i + 1 < cleaned.length) {
            bytes.push(parseInt(cleaned.substr(i, 2), 16));
        }
    }
    return bytes;
}

function searchInData(query, searchType) {
    if (!fileData || !query.trim()) return [];
    
    const matches = [];
    let searchBytes = [];
    
    if (searchType === 'hex') {
        searchBytes = parseHexInput(query);
        if (searchBytes.length === 0) return [];
    } else if (searchType === 'ascii') {
        searchBytes = Array.from(query).map(c => c.charCodeAt(0));
    } else if (searchType === 'offset') {
        // Jump to offset
        const offset = parseInt(query, 16);
        if (!isNaN(offset) && offset >= 0 && offset < fileData.length) {
            return [{ offset, length: 1 }];
        }
        return [];
    }
    
    // Search for byte sequence in file data
    for (let i = 0; i <= fileData.length - searchBytes.length; i++) {
        let found = true;
        for (let j = 0; j < searchBytes.length; j++) {
            if (fileData[i + j] !== searchBytes[j]) {
                found = false;
                break;
            }
        }
        if (found) {
            matches.push({ offset: i, length: searchBytes.length });
        }
    }
    
    return matches;
}

function performSearch() {
    const query = document.getElementById('searchInput').value;
    const searchType = document.getElementById('searchType').value;
    
    const results = searchInData(query, searchType);
    
    searchMatches = results.map(r => r.offset);
    searchHighlightRanges = results.map(r => ({ start: r.offset, end: r.offset + r.length }));
    currentMatchIndex = results.length > 0 ? 0 : -1;
    
    updateSearchUI();
    
    if (results.length > 0) {
        goToMatch(0);
    } else {
        updateView();
    }
}

function goToMatch(index) {
    if (index < 0 || index >= searchMatches.length) return;
    
    currentMatchIndex = index;
    const matchOffset = searchMatches[index];
    
    // Calculate which page contains this offset
    const targetPage = Math.floor(matchOffset / bytesPerPage) + 1;
    currentPage = targetPage;
    
    updateSearchUI();
    updateView();
}

function updateSearchUI() {
    const resultsDiv = document.getElementById('searchResults');
    const infoSpan = document.getElementById('searchInfo');
    const prevBtn = document.getElementById('btnPrevMatch');
    const nextBtn = document.getElementById('btnNextMatch');
    
    if (searchMatches.length > 0) {
        resultsDiv.classList.remove('hidden');
        infoSpan.textContent = `Found ${searchMatches.length} match${searchMatches.length > 1 ? 'es' : ''} - Showing ${currentMatchIndex + 1} of ${searchMatches.length}`;
        prevBtn.disabled = currentMatchIndex <= 0;
        nextBtn.disabled = currentMatchIndex >= searchMatches.length - 1;
    } else if (document.getElementById('searchInput').value.trim()) {
        resultsDiv.classList.remove('hidden');
        infoSpan.textContent = 'No matches found';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
    } else {
        resultsDiv.classList.add('hidden');
    }
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    searchMatches = [];
    searchHighlightRanges = [];
    currentMatchIndex = -1;
    document.getElementById('searchResults').classList.add('hidden');
    updateView();
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
    btn.addEventListener('click', function () {
        currentMode = this.dataset.mode;
        updateButtonStyles(currentMode);
        updateView();
    });
});

// Pagination button handlers
document.getElementById("btnPrevious").addEventListener("click", function () {
    if (currentPage > 1) {
        currentPage--;
        updateView();
    }
});

document.getElementById("btnNext").addEventListener("click", function () {
    if (currentPage < getTotalPages()) {
        currentPage++;
        updateView();
    }
});

// Bytes per page selector
document.getElementById("bytesPerPage").addEventListener("change", function () {
    bytesPerPage = parseInt(this.value);
    currentPage = 1; // Reset to first page
    updateView();
});

// Search handlers
document.getElementById("btnSearch").addEventListener("click", performSearch);

document.getElementById("searchInput").addEventListener("keypress", function (e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});

document.getElementById("btnClearSearch").addEventListener("click", clearSearch);

document.getElementById("btnPrevMatch").addEventListener("click", function () {
    if (currentMatchIndex > 0) {
        goToMatch(currentMatchIndex - 1);
    }
});

document.getElementById("btnNextMatch").addEventListener("click", function () {
    if (currentMatchIndex < searchMatches.length - 1) {
        goToMatch(currentMatchIndex + 1);
    }
});

// Sync vertical scroll between data and ASCII panels
let isSyncing = false;
const dataContainer = document.getElementById('dataScrollContainer');
const asciiContainer = document.getElementById('asciiScrollContainer');

dataContainer.addEventListener('scroll', function() {
    if (isSyncing) return;
    isSyncing = true;
    asciiContainer.scrollTop = dataContainer.scrollTop;
    isSyncing = false;
});

asciiContainer.addEventListener('scroll', function() {
    if (isSyncing) return;
    isSyncing = true;
    dataContainer.scrollTop = asciiContainer.scrollTop;
    isSyncing = false;
});

// Initialize
updateButtonStyles('hex');
updatePagination();