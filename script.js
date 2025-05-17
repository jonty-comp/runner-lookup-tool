document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const runnerNumberInput = document.getElementById('runner-number');
    const runnerInfo = document.getElementById('runner-info');
    const currentInputDisplay = document.getElementById('current-input-display');
    const runnersTable = document.getElementById('runners-table');
    const runnersTableBody = document.getElementById('runners-table-body');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');
    const tableHeaders = document.querySelectorAll('th[data-sort]');

    // State variables
    let runners = [];
    let sortColumn = 'race_no';
    let sortDirection = 'asc';
    let currentFilter = '';
    let lookupDebounceTimer = null;
    let resetInputTimer = null;
    const resetInputTimeout = 1500; // 1.5 seconds timeout for reset

    // Initialize the app
    init();

    function init() {
        // Load data from runners.json file
        loadRunnerData('runners.json');

        // Initialize the shouldClear flag to false
        runnerNumberInput.dataset.shouldClear = 'false';

        // Initialize the current input display
        updateCurrentInputDisplay();

        // Setup event listeners
        setupEventListeners();
    }

    function setupEventListeners() {
        // Runner lookup
        runnerNumberInput.addEventListener('input', function (e) {
            // Clear any existing timers
            clearTimeout(lookupDebounceTimer);
            clearTimeout(resetInputTimer);

            // Remove timeout-elapsed class when user types
            document.body.classList.remove('timeout-elapsed');

            // Create a new timer to reset the input field after timeout period
            resetInputTimer = setTimeout(() => {
                setInputReadyForReset();
                
                // If there are any matches shown currently, update the styling
                if (document.querySelector('.multi-match')) {
                    handleRunnerLookup();
                }
            }, resetInputTimeout);

            // If the shouldClear flag is set and this is a new input, clear the field first
            if (runnerNumberInput.dataset.shouldClear === 'true' && e.inputType === 'insertText') {
                // Clear the input field but keep the latest character
                const latestChar = e.data;
                runnerNumberInput.value = latestChar;

                // Reset input state
                resetInputState();
            }

            // Create a new timer with a short delay for lookup
            lookupDebounceTimer = setTimeout(() => {
                handleRunnerLookup();
                // Update the displayed table based on the search text
                currentFilter = runnerNumberInput.value.toLowerCase();
                renderTable();

                // Update the current input display
                updateCurrentInputDisplay();
            }, 50);
        });

        // Global keyboard input handler
        document.addEventListener('keydown', function (e) {
            // Don't capture if the user is typing in another input or textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Capture alphanumeric keys and focus/type into the hidden input
            const key = e.key;
            if (/^[a-zA-Z0-9]$/.test(key)) {
                // Focus the input if it's not already focused
                runnerNumberInput.focus();
                // Check if we should clear the input first (after timeout)
                if (runnerNumberInput.dataset.shouldClear === 'true') {
                    runnerNumberInput.value = key;
                    resetInputState();
                } else {
                    // Simulate typing the character
                    runnerNumberInput.value += key;
                }

                // Manually trigger the input event
                const inputEvent = new Event('input', { bubbles: true });
                runnerNumberInput.dispatchEvent(inputEvent);
            } else if (key === 'Backspace') {
                // Handle backspace to delete characters
                const currentValue = runnerNumberInput.value;
                if (currentValue.length > 0) {
                    runnerNumberInput.value = currentValue.slice(0, -1);
                    // Manually trigger the input event
                    const inputEvent = new Event('input', { bubbles: true });
                    runnerNumberInput.dispatchEvent(inputEvent);

                    // Update the current input display directly
                    updateCurrentInputDisplay();
                }
                e.preventDefault(); // Prevent browser back action
            } else if (key === 'Escape') {
                // Clear the input on escape
                runnerNumberInput.value = '';
                resetInputState();

                const inputEvent = new Event('input', { bubbles: true });
                runnerNumberInput.dispatchEvent(inputEvent);

                // Update the current input display directly
                updateCurrentInputDisplay();
            } else if (key === 'Enter') {
                // Handle enter key
                handleRunnerLookup();
            }
        });

        // Table sorting
        tableHeaders.forEach(header => {
            header.addEventListener('click', function () {
                const column = this.dataset.sort;
                if (sortColumn === column) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumn = column;
                    sortDirection = 'asc';
                }

                // Update sort icons
                updateSortIcons(this);

                // Sort and render table
                sortTable(column, sortDirection);
            });
        });

        // Navigate with keyboard
        runnerNumberInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                handleRunnerLookup();
            }
        });
    }

    function loadRunnerData(file) {
        // Show loader and hide table
        loader.style.display = 'block';
        runnersTable.style.display = 'none';
        errorMessage.textContent = '';

        // Fetch runner data from JSON file
        fetch(file)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load data file: ${file} (Status: ${response.status})`);
                }
                return response.json();
            })
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    throw new Error('Invalid data format: Expected non-empty array of runners');
                }

                runners = data;
                renderTable();
                loader.style.display = 'none';
                runnersTable.style.display = 'table';
            })
            .catch(error => {
                console.error('Error loading runner data:', error);
                errorMessage.textContent = `Error loading data: ${error.message}`;
                errorMessage.style.display = 'block';
                loader.style.display = 'none';

                // Show table with empty data if we have runners from before
                if (runners.length > 0) {
                    runnersTable.style.display = 'table';
                }
            });
    }

    function handleRunnerLookup() {
        const searchTerm = runnerNumberInput.value.trim();
        
        // Show welcome message if search is empty
        if (searchTerm === '') {
            runnerInfo.innerHTML = `
                <div class="welcome-message">Enter a number</div>
                <div class="welcome-subtext">or name to see runner details</div>
            `;
            return;
        }

        // Find matching runners
        const matchingRunners = findMatchingRunners(searchTerm);

        if (matchingRunners.length > 0) {
            // Update UI with the top match and match count
            updateUIWithMatchResult(matchingRunners[0], matchingRunners.length, searchTerm);
        } else {
            // No matches found
            runnerInfo.classList.remove('multi-match');
            runnerInfo.innerHTML = `
                <div class="error-text">No Runner Found</div>
                <div class="error-subtext">No runner found with: ${searchTerm}</div>
            `;
        }
    }

    // Find and sort runners that match the search term
    function findMatchingRunners(searchTerm) {
        // Get all matching runners
        const matches = runners.filter(runner => 
            // Match by number (starts with)
            runner.race_no.toString().startsWith(searchTerm) || 
            // Match by name (contains, case insensitive)
            (isNaN(searchTerm) && runner.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        // Sort matches: exact matches first, then numeric or alphabetical
        return matches.sort((a, b) => {
            // Exact number match gets highest priority
            if (a.race_no.toString() === searchTerm) return -1;
            if (b.race_no.toString() === searchTerm) return 1;
            
            // Otherwise sort numerically for numeric searches
            if (!isNaN(searchTerm)) {
                return a.race_no - b.race_no;
            }
            
            // For text searches, sort alphabetically
            return a.full_name.localeCompare(b.full_name);
        });
    }

    // Helper to update UI with runner match result
    function updateUIWithMatchResult(runner, totalMatches, searchTerm) {
        const isMultiMatch = totalMatches > 1;
        
        // Display runner information
        displayRunnerInfo(runner, isMultiMatch);
        highlightRunner(runner);
        
        // Update classes based on match count
        runnerInfo.classList.toggle('multi-match', isMultiMatch);
        
        // Set input state based on match count
        if (totalMatches === 1) {
            setInputReadyForReset();
        } else if (runnerNumberInput.dataset.shouldClear === 'true') {
            // If timeout elapsed with multiple matches, update styling
            displayRunnerInfo(runner, true);
        }
        
        // Add count of additional matches if there are more
        if (isMultiMatch) {
            const additionalMatches = document.createElement('div');
            additionalMatches.className = 'additional-matches';
            additionalMatches.textContent = `+${totalMatches - 1} more`;
            runnerInfo.appendChild(additionalMatches);
        }
    }

    function displayRunnerInfo(runner, isMultipleMatches) {
        // Ensure club name doesn't break layout by shortening if needed
        let clubName = runner.club || 'N/A';
        if (clubName.length > 30) {
            clubName = clubName.substring(0, 27) + '...';
        }

        // Apply normal text style if:
        // 1. There's only one match, OR
        // 2. The timeout has elapsed (input is ready for reset)
        const isConfirmed = !isMultipleMatches || runnerNumberInput.dataset.shouldClear === 'true';
        const textClass = isConfirmed ? 'normal-text' : 'muted-text';
        
        runnerInfo.innerHTML = `
            <div class="runner-name ${textClass}">#${runner.race_no} - ${runner.full_name}</div>
            <div class="runner-age-category ${textClass}">${runner.age || 'N/A'} &middot; ${runner.category || 'N/A'}</div>
            <div class="runner-club ${textClass}">${clubName}</div>
        `;
    }

    function highlightRunner(runner) {
        // Remove any existing highlights
        const highlightedRows = document.querySelectorAll('tr.highlighted');
        highlightedRows.forEach(row => row.classList.remove('highlighted'));

        // Find the row for this runner and highlight it
        const rows = runnersTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            if (row.dataset.runnerId === runner.race_no.toString()) {
                row.classList.add('highlighted');

                // Ensure the highlighted row is visible by scrolling to it
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    function renderTable() {
        // Clear the table body
        runnersTableBody.innerHTML = '';

        // Filter runners based on the current filter
        const filteredRunners = filterRunners(runners, currentFilter);

        // Show message if no runners match the filter
        if (filteredRunners.length === 0) {
            errorMessage.textContent = `No runners found matching: ${currentFilter}`;
            errorMessage.style.display = 'block';
        } else {
            errorMessage.textContent = '';
            errorMessage.style.display = 'none';
        }

        // Sort the filtered runners - match the same sorting logic as the lookup
        let sortedRunners = filteredRunners;

        // If filtering by a number, use the logical sort for numbers starting with that digit
        if (currentFilter && !isNaN(currentFilter)) {
            // First sort numerically by bib number
            sortedRunners = [...filteredRunners].sort((a, b) => a.race_no - b.race_no);
            // Then move exact matches to the top
            sortedRunners.sort((a, b) => {
                if (a.race_no.toString() === currentFilter) return -1;
                if (b.race_no.toString() === currentFilter) return 1;
                return 0;
            });
        } else {
            // Otherwise use the selected sort column
            sortedRunners = sortRunners(filteredRunners, sortColumn, sortDirection);
        }

        // Render the rows
        sortedRunners.forEach(createTableRow);
    }

    // Create a table row for a runner
    function createTableRow(runner) {
        const row = document.createElement('tr');
        row.dataset.runnerId = runner.race_no;
        row.innerHTML = `
            <td>${runner.race_no}</td>
            <td>${runner.full_name}</td>
            <td>${runner.age || 'N/A'}</td>
            <td>${runner.category || 'N/A'}</td>
            <td>${runner.club || 'N/A'}</td>
        `;

        // Add click event to the row
        row.addEventListener('click', () => {
            runnerNumberInput.value = runner.race_no;
            handleRunnerLookup();
        });

        runnersTableBody.appendChild(row);
    }

    function sortRunners(runners, column, direction) {
        return [...runners].sort((a, b) => {
            let valueA = a[column];
            let valueB = b[column];

            // Handle numeric values
            if (column === 'race_no' || column === 'age') {
                valueA = parseInt(valueA) || 0;
                valueB = parseInt(valueB) || 0;
            } else {
                // String comparison (case-insensitive)
                valueA = (valueA || '').toString().toLowerCase();
                valueB = (valueB || '').toString().toLowerCase();
            }

            // Sort logic
            if (valueA < valueB) {
                return direction === 'asc' ? -1 : 1;
            }
            if (valueA > valueB) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    function sortTable(column, direction) {
        sortColumn = column;
        sortDirection = direction;
        renderTable();
    }

    function updateSortIcons(clickedHeader) {
        // Remove all sort icons
        tableHeaders.forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            header.classList.add('sort-icon');
        });

        // Add appropriate sort icon to clicked header
        clickedHeader.classList.remove('sort-icon');
        clickedHeader.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    }

    function updateCurrentInputDisplay() {
        // Update the current input display
        if (currentInputDisplay) {
            const currentValue = runnerNumberInput.value.trim();
            if (currentValue === '') {
                currentInputDisplay.textContent = '';
                currentInputDisplay.style.display = 'none';
            } else {
                currentInputDisplay.textContent = `Input: ${currentValue}`;
                currentInputDisplay.style.display = 'block';

                // Add or remove the ready-for-reset class as appropriate
                if (runnerNumberInput.dataset.shouldClear === 'true') {
                    currentInputDisplay.classList.add('input-ready-for-reset');
                } else {
                    currentInputDisplay.classList.remove('input-ready-for-reset');
                }
            }
        }
    }

    // Helper function to set the input as ready for reset
    function setInputReadyForReset() {
        runnerNumberInput.dataset.shouldClear = 'true';
        runnerNumberInput.classList.add('ready-for-reset');
        document.body.classList.add('timeout-elapsed');
        
        if (currentInputDisplay) {
            currentInputDisplay.classList.add('input-ready-for-reset');
        }
        
        // Clear any existing reset timer
        clearTimeout(resetInputTimer);
    }
    
    // Helper to clear input state
    function resetInputState() {
        runnerNumberInput.dataset.shouldClear = 'false';
        runnerNumberInput.classList.remove('ready-for-reset');
        currentInputDisplay.classList.remove('input-ready-for-reset');
        document.body.classList.remove('timeout-elapsed');
    }

    // Helper function to filter runners based on search term
    function filterRunners(runners, filterTerm) {
        if (!filterTerm || filterTerm === '') return runners;
        
        return runners.filter(runner => 
            // Match by race number (starts with)
            runner.race_no.toString().startsWith(filterTerm) ||
            // Match by name, club, or category (contains, case insensitive)
            (runner.full_name && runner.full_name.toLowerCase().includes(filterTerm)) ||
            (runner.club && runner.club.toLowerCase().includes(filterTerm)) ||
            (runner.category && runner.category.toLowerCase().includes(filterTerm))
        );
    }
});
