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
    const resetInputTimeout = 3000; // 3 seconds timeout for reset

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
            // Clear any existing lookup debounce timer
            clearTimeout(lookupDebounceTimer);
            // Clear any existing reset timer when the user types
            clearTimeout(resetInputTimer);

            // Remove timeout-elapsed class when user types
            document.body.classList.remove('timeout-elapsed');

            // Create a new timer to reset the input field after timeout period
            resetInputTimer = setTimeout(() => {
                // We don't clear the field here, just set a flag to clear on next input
                runnerNumberInput.dataset.shouldClear = 'true';
                // Add a visual indicator class to show the input is ready for reset
                runnerNumberInput.classList.add('ready-for-reset');

                // Add timeout-elapsed class to body to change background color
                document.body.classList.add('timeout-elapsed');

                // Update the input display to show it's ready for reset
                if (currentInputDisplay && runnerNumberInput.value.trim() !== '') {
                    currentInputDisplay.classList.add('input-ready-for-reset');
                }
            }, resetInputTimeout);

            // If the shouldClear flag is set and this is a new input, clear the field first
            if (runnerNumberInput.dataset.shouldClear === 'true' && e.inputType === 'insertText') {
                // Get the latest character that was typed
                const latestChar = e.data;

                // Clear the input field
                runnerNumberInput.value = latestChar;

                // Reset the flag
                runnerNumberInput.dataset.shouldClear = 'false';

                // Remove the visual indicators
                runnerNumberInput.classList.remove('ready-for-reset');
                currentInputDisplay.classList.remove('input-ready-for-reset');
                document.body.classList.remove('timeout-elapsed');
            }

            // Create a new timer with a very short delay (50ms) for lookup
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
                    runnerNumberInput.dataset.shouldClear = 'false';
                    runnerNumberInput.classList.remove('ready-for-reset');
                    document.body.classList.remove('timeout-elapsed');
                } else {
                    // Simulate typing the character (we don't trigger the input event directly)
                    const currentValue = runnerNumberInput.value;
                    runnerNumberInput.value = currentValue + key;
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
                runnerNumberInput.dataset.shouldClear = 'false';
                runnerNumberInput.classList.remove('ready-for-reset');
                document.body.classList.remove('timeout-elapsed');

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
        if (searchTerm === '') {
            // Clear the displayed runner info if search is empty
            runnerInfo.innerHTML = `
                <div class="welcome-message">Enter a number</div>
                <div class="welcome-subtext">or name to see runner details</div>
            `;
            return;
        }

        // Get all matching runners
        const matchingRunners = runners.filter(runner => {
            // Match by number (starts with)
            if (runner.race_no.toString().startsWith(searchTerm)) {
                return true;
            }

            // Match by name (contains, case insensitive)
            if (isNaN(searchTerm) && runner.full_name.toLowerCase().includes(searchTerm.toLowerCase())) {
                return true;
            }

            return false;
        });

        // Always show the first matching result, if available
        if (matchingRunners.length > 0) {
            // Sort by exact number match first, then by partial number match, then by name
            matchingRunners.sort((a, b) => {
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

            const foundRunner = matchingRunners[0];
            // Display runner information in the info section
            displayRunnerInfo(foundRunner, matchingRunners.length > 1);

            // Highlight the runner in the table
            highlightRunner(foundRunner);
            
            // Add multi-match class if there are multiple matches
            if (matchingRunners.length > 1) {
                runnerInfo.classList.add('multi-match');
            } else {
                runnerInfo.classList.remove('multi-match');
            }
            
            // If there is exactly one match, reset the input timer immediately
            // This means we've found the exact runner and can be ready for the next input
            if (matchingRunners.length === 1) {
                // Mark the input as ready to clear on next keystroke
                runnerNumberInput.dataset.shouldClear = 'true';
                runnerNumberInput.classList.add('ready-for-reset');
                document.body.classList.add('timeout-elapsed');
                
                // Update the input display to show it's ready for reset
                if (currentInputDisplay) {
                    currentInputDisplay.classList.add('input-ready-for-reset');
                }
                
                // Clear any existing reset timer
                clearTimeout(resetInputTimer);
            }
              
            // Add count of additional matches if there are more
            if (matchingRunners.length > 1) {
                const additionalMatches = document.createElement('div');
                additionalMatches.className = 'additional-matches';
                additionalMatches.textContent = `+${matchingRunners.length - 1} more`;
                runnerInfo.appendChild(additionalMatches);
            }
        } else {
            runnerInfo.classList.remove('multi-match');
            runnerInfo.innerHTML = `
                <div class="error-text">No Runner Found</div>
                <div class="error-subtext">No runner found with: ${searchTerm}</div>
            `;
        }
    }

    function displayRunnerInfo(runner, isMultipleMatches) {
        // Ensure club name doesn't break layout by shortening if needed
        let clubName = runner.club || 'N/A';
        if (clubName.length > 30) {
            clubName = clubName.substring(0, 27) + '...';
        }

        // Apply muted style if there are multiple matches
        const textClass = isMultipleMatches ? 'muted-text' : 'normal-text';
        runnerInfo.innerHTML = `
            <div class="runner-name ${textClass}">#${runner.race_no} - ${runner.full_name}</div>
            <div class="runner-age-category ${textClass}">${runner.age || 'N/A'} &middot; ${runner.category || 'N/A'}</div>
            <div class="runner-club ${textClass}">${runner.club || 'N/A'}</div>
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
        const filteredRunners = runners.filter(runner => {
            if (!currentFilter || currentFilter === '') return true;

            // Match by race number (starts with - for consistent behavior with lookup)
            if (runner.race_no.toString().startsWith(currentFilter)) {
                return true;
            }

            // Check various text fields for matches (contains)
            return (
                (runner.full_name && runner.full_name.toLowerCase().includes(currentFilter)) ||
                (runner.club && runner.club.toLowerCase().includes(currentFilter)) ||
                (runner.category && runner.category.toLowerCase().includes(currentFilter))
            );
        });

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
            sortedRunners = [...filteredRunners].sort((a, b) => a.number - b.number);
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
        sortedRunners.forEach(runner => {
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
        });
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
});
