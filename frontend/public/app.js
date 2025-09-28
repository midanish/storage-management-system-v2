class StorageManager {
    constructor() {
        console.log('StorageManager constructor called');
        this.API_BASE = window.location.origin + '/api';
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.packages = [];
        this.borrowHistory = [];

        console.log('API_BASE:', this.API_BASE);
        console.log('Token exists:', !!this.token);
        console.log('User:', this.user);

        this.init();
    }

    init() {
        console.log('StorageManager init called');
        console.log('Token and user.id check:', this.token, this.user.id);
        
        if (this.token && this.user.id) {
            console.log('Showing main app');
            this.showMainApp().then(() => {
                // Check for pending operations
                const pendingBorrowPackageId = localStorage.getItem('pendingBorrowPackageId');
                const pendingVerifyBorrowId = localStorage.getItem('pendingVerifyBorrowId');

                // Clear pending flags immediately
                localStorage.removeItem('pendingBorrowPackageId');
                localStorage.removeItem('pendingVerifyBorrowId');

                // Handle pending operations with a delay to ensure full page load
                setTimeout(() => {
                    if (pendingBorrowPackageId) {
                        console.log('Opening pending borrow modal for package:', pendingBorrowPackageId);
                        this.showBorrowModal(pendingBorrowPackageId);
                    } else if (pendingVerifyBorrowId) {
                        console.log('Opening pending verify return modal for borrow:', pendingVerifyBorrowId);
                        this.showVerifyReturnModal(pendingVerifyBorrowId);
                    }
                }, 500); // Give time for the page to fully load
            });
        } else {
            console.log('Showing login page');
            this.showLoginPage();
        }

        this.setupEventListeners();
        this.generateDefectCountInputs();
        console.log('StorageManager init completed');
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Ensure DOM elements exist before adding listeners
        const loginForm = document.getElementById('loginForm');
        const addItemForm = document.getElementById('addItemForm');
        
        console.log('Login form found:', !!loginForm);
        console.log('Add item form found:', !!addItemForm);
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            console.log('Login form listener attached');
        }
        
        if (addItemForm) {
            addItemForm.addEventListener('submit', (e) => this.handleAddItem(e));
            console.log('Add item form listener attached');
        }

        // Button event listeners with improved delegation
        document.addEventListener('click', (e) => {
            console.log('Click event detected:', e.target);
            
            // Only prevent default for buttons that aren't in forms
            const button = e.target.matches('button') ? e.target : e.target.closest('button');
            if (button && !button.closest('form')) {
                console.log('Button click detected, preventing default');
                e.preventDefault();
            }
            
            if (e.target.id === 'logoutBtn' || e.target.closest('#logoutBtn')) {
                console.log('Logout button clicked');
                e.preventDefault();
                this.logout();
            } else if (e.target.id === 'toggleFiltersBtn' || e.target.closest('#toggleFiltersBtn')) {
                console.log('Toggle filters button clicked');
                e.preventDefault();
                this.toggleFilters();
            } else if (e.target.id === 'refreshPackagesBtn' || e.target.closest('#refreshPackagesBtn')) {
                console.log('Refresh packages button clicked');
                e.preventDefault();
                this.refreshPackages();
            } else if (e.target.id === 'submitBorrowBtn' || e.target.closest('#submitBorrowBtn')) {
                console.log('Submit borrow button clicked');
                e.preventDefault();
                this.submitBorrow();
            } else if (e.target.id === 'submitVerifyReturnBtn' || e.target.closest('#submitVerifyReturnBtn')) {
                console.log('Submit verify return button clicked');
                e.preventDefault();
                this.submitVerifyReturn();
            } else if (e.target.id === 'submitEditBtn' || e.target.closest('#submitEditBtn')) {
                console.log('Submit edit button clicked');
                e.preventDefault();
                this.submitEditPackage();
            } else if (e.target.closest('.edit-btn')) {
                console.log('Edit button clicked');
                e.preventDefault();
                const packageId = e.target.closest('.edit-btn').getAttribute('data-package-id');
                console.log('Edit package ID:', packageId);
                this.editPackage(packageId);
            } else if (e.target.closest('.delete-btn')) {
                console.log('Delete button clicked');
                e.preventDefault();
                const packageId = e.target.closest('.delete-btn').getAttribute('data-package-id');
                console.log('Delete package ID:', packageId);
                this.deletePackage(packageId);
            } else if (e.target.closest('.borrow-btn')) {
                console.log('Borrow button clicked');
                e.preventDefault();
                const packageId = e.target.closest('.borrow-btn').getAttribute('data-package-id');
                console.log('Borrow package ID:', packageId);
                // Store package ID and reload
                localStorage.setItem('pendingBorrowPackageId', packageId);
                window.location.reload();
            } else if (e.target.closest('.verify-return-btn')) {
                console.log('Verify return button clicked');
                e.preventDefault();
                const borrowId = e.target.closest('.verify-return-btn').getAttribute('data-borrow-id');
                console.log('Verify return borrow ID:', borrowId);
                // Store borrow ID and reload
                localStorage.setItem('pendingVerifyBorrowId', borrowId);
                window.location.reload();
            } else if (e.target.closest('.return-item-btn')) {
                console.log('Return item button clicked');
                e.preventDefault();
                const borrowId = e.target.closest('.return-item-btn').getAttribute('data-borrow-id');
                console.log('Return item borrow ID:', borrowId);
                this.returnItem(borrowId);
            } else if (e.target.closest('.view-btn')) {
                console.log('View button clicked');
                e.preventDefault();
                const packageId = e.target.closest('.view-btn').getAttribute('data-package-id');
                console.log('View package ID:', packageId);
                this.viewPackageDetails(packageId);
            } else if (e.target.closest('.package-code-link')) {
                console.log('Package code link clicked');
                e.preventDefault();
                const packageId = e.target.closest('.package-code-link').getAttribute('data-package-id');
                console.log('Package code link package ID:', packageId);
                this.viewPackageDetails(packageId);
            }
        });

        // Event delegation for edit defect count inputs
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('edit-defect-input')) {
                this.calculateEditTotalSamples();
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.matches('.defect-count-input')) {
                this.calculateTotalSamples();
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.matches('#filterPackageCode, #filterCategory, #filterShift, #filterAvailable')) {
                this.applyFilters();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.target.matches('#filterPackageCode')) {
                this.applyFilters();
            }
        });

        // Ensure mainTabs exists before adding listener
        const mainTabs = document.getElementById('mainTabs');
        if (mainTabs) {
            mainTabs.addEventListener('shown.bs.tab', (e) => {
                if (e.target.id === 'dashboard-tab') {
                    this.loadPackages();
                } else if (e.target.id === 'returns-tab') {
                    this.loadBorrowHistory();
                }
            });
        }
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        console.log(`API Call: ${method} ${endpoint}`, data);
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.API_BASE}${endpoint}`, config);
            console.log(`API Response: ${response.status} ${endpoint}`);

            if (response.status === 401) {
                console.log('Unauthorized - logging out');
                this.logout();
                return null;
            }

            const result = await response.json();
            console.log(`API Result:`, result);

            if (!response.ok) {
                throw new Error(result.message || 'API call failed');
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            this.showAlert(error.message, 'danger');
            return null;
        }
    }

    async handleLogin(e) {
        console.log('Login form submitted');
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            this.showAlert('Please enter both email and password', 'warning');
            return;
        }
        
        console.log('Login attempt with email:', email);
        
        try {
            const result = await this.apiCall('/auth/login', 'POST', { email, password });
            console.log('Login API response:', result);

            if (result && result.token && result.user) {
                console.log('Login successful');
                this.token = result.token;
                this.user = result.user;

                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));

                this.showAlert('Login successful!', 'success');
                this.showMainApp();
            } else {
                console.log('Login failed - invalid response:', result);
                this.showAlert('Login failed - please check your credentials', 'danger');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('Login failed - ' + (error.message || 'Unknown error'), 'danger');
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = {};

        // Clear all cached data to prevent showing previous user's data
        this.packages = [];
        this.borrowHistory = [];
        this.allPackages = [];

        this.showLoginPage();
    }

    showLoginPage() {
        try {
            const loginPage = document.getElementById('loginPage');
            const mainApp = document.getElementById('mainApp');
            
            if (loginPage) loginPage.style.display = 'block';
            if (mainApp) mainApp.style.display = 'none';
        } catch (error) {
            console.error('Error showing login page:', error);
        }
    }

    async showMainApp() {
        try {
            const loginPage = document.getElementById('loginPage');
            const mainApp = document.getElementById('mainApp');
            const usernameEl = document.getElementById('username');
            const userRoleEl = document.getElementById('userRole');

            if (loginPage) loginPage.style.display = 'none';
            if (mainApp) mainApp.style.display = 'block';
            if (usernameEl) usernameEl.textContent = this.user.username;
            if (userRoleEl) userRoleEl.textContent = this.user.role;

            // Load all data fresh for the new user with proper sequencing
            await this.loadPackages();
            await Promise.all([
                this.loadFilterOptions(),
                this.loadVerifiers(),
                this.loadBorrowHistory()
            ]);

            return true; // Indicate successful initialization

        } catch (error) {
            console.error('Error showing main app:', error);
            this.showAlert('Error loading application interface', 'error');
            return false;
        }
    }

    async loadPackages() {
        const packages = await this.apiCall('/packages');
        if (packages) {
            this.packages = packages;
            this.allPackages = [...packages]; // Store original packages for filtering
            this.renderPackagesTable();
        }
    }

    async loadFilterOptions() {
        const options = await this.apiCall('/packages/options');
        if (options) {
            this.populateSelect('filterCategory', options.categories);
            this.populateSelect('filterShift', options.shifts);
            this.populateSelect('category', options.categories);
        }
    }

    async loadVerifiers() {
        const verifiers = await this.apiCall('/verifiers');
        if (verifiers) {
            this.populateSelect('verifierSelect', verifiers, 'Username', 'ID');
        }
    }

    async loadBorrowHistory() {
        const history = await this.apiCall('/borrow-history');
        if (history) {
            this.borrowHistory = history;
            this.renderBorrowHistoryTable();
        }
    }

    populateSelect(selectId, options, textField = null, valueField = null) {
        const select = document.getElementById(selectId);
        const currentOptions = select.querySelectorAll('option:not([value=""])');
        currentOptions.forEach(option => option.remove());

        options.forEach(option => {
            const optionElement = document.createElement('option');
            if (textField && valueField) {
                optionElement.value = option[valueField];
                optionElement.textContent = option[textField];
            } else {
                optionElement.value = option;
                optionElement.textContent = option;
            }
            select.appendChild(optionElement);
        });
    }

    renderPackagesTable() {
        const tbody = document.querySelector('#packagesTable tbody');
        tbody.innerHTML = '';

        this.packages.forEach(pkg => {
            const row = document.createElement('tr');

            const availabilityBadge = pkg['MATERIAL AT ENG ROOM'] === 'YES'
                ? '<span class="badge bg-success">Available</span>'
                : '<span class="badge bg-danger">Not Available</span>';

            const canEdit = this.user.role === 'Admin';
            const canBorrow = ['Admin', 'Engineer'].includes(this.user.role) && pkg['MATERIAL AT ENG ROOM'] === 'YES';

            let actions = '';
            if (canEdit) {
                actions += `<button class="btn btn-sm btn-outline-primary me-1 edit-btn" data-package-id="${pkg.ID}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>`;
                actions += `<button class="btn btn-sm btn-outline-danger me-1 delete-btn" data-package-id="${pkg.ID}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>`;
            }
            if (canBorrow) {
                actions += `<button class="btn btn-sm btn-outline-success borrow-btn" data-package-id="${pkg.ID}" title="Borrow">
                    <i class="fas fa-hand-holding"></i>
                </button>`;
            }

            // Add view button for all users
            let allActions = `<button class="btn btn-sm btn-outline-info me-1 view-btn" data-package-id="${pkg.ID}" title="View Details">
                <i class="fas fa-eye"></i>
            </button>`;
            allActions += actions;

            row.innerHTML = `
                <td>${pkg.ID}</td>
                <td><span class="package-code-link" data-package-id="${pkg.ID}" style="cursor: pointer; color: #0066cc; text-decoration: underline;">${pkg.Packagecode || ''}</span></td>
                <td>${pkg.Packagedescription || ''}</td>
                <td>${pkg['Temporary Cabinet'] || ''}</td>
                <td>${pkg.Category || ''}</td>
                <td>${pkg['SampleCreatedByShift(A/B/C)'] || ''}</td>
                <td>${availabilityBadge}</td>
                <td>${pkg.TotalSample || 0}</td>
                <td>${allActions || 'No actions available'}</td>
            `;

            tbody.appendChild(row);
        });
    }

    renderBorrowHistoryTable() {
        const tbody = document.querySelector('#borrowHistoryTable tbody');
        tbody.innerHTML = '';

        this.borrowHistory.forEach(item => {
            const row = document.createElement('tr');

            const statusClass = {
                'In Progress': 'bg-warning',
                'Pending': 'bg-info',
                'Approved': 'bg-info',
                'Returned': 'bg-success',
                'Returned with Remarks': 'bg-warning'
            };

            const dueDate = new Date(item.due_at);
            const now = new Date();
            const timeLeft = dueDate - now;
            const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

            let timerDisplay = '';
            if (item.return_status === 'In Progress') {
                if (timeLeft > 0) {
                    timerDisplay = `<span class="timer-normal">${hoursLeft}h left</span>`;
                } else {
                    timerDisplay = `<span class="timer-warning">OVERDUE</span>`;
                }
            }

            let actions = '';

            // Convert IDs to numbers for proper comparison
            const borrowerId = parseInt(item.Borrower_ID);
            const verifierId = parseInt(item.Verifier_ID);
            const userId = parseInt(this.user.id);

            // Technician: Can verify returns for items they are verifying
            if (this.user.role === 'Technician' && item.return_status === 'Pending' && verifierId === userId) {
                actions = `<button class="btn btn-sm btn-success verify-return-btn" data-borrow-id="${item.ID}">
                    <i class="fas fa-check"></i> Verify
                </button>`;
            }
            // Admin: Can return items they borrowed OR verify items they are verifying
            else if (this.user.role === 'Admin') {
                if (borrowerId === userId && item.return_status === 'In Progress') {
                    actions = `<button class="btn btn-sm btn-warning return-item-btn" data-borrow-id="${item.ID}">
                        <i class="fas fa-undo"></i> Return
                    </button>`;
                } else if (item.return_status === 'Pending' && verifierId === userId) {
                    actions = `<button class="btn btn-sm btn-success verify-return-btn" data-borrow-id="${item.ID}">
                        <i class="fas fa-check"></i> Verify
                    </button>`;
                }
            }
            // Engineer: Can only return items they borrowed
            else if (this.user.role === 'Engineer' && borrowerId === userId && item.return_status === 'In Progress') {
                actions = `<button class="btn btn-sm btn-warning return-item-btn" data-borrow-id="${item.ID}">
                    <i class="fas fa-undo"></i> Return
                </button>`;
            }

            row.innerHTML = `
                <td>${item.Packagecode}</td>
                <td>${item.BorrowerName}</td>
                <td>${item.VerifierName}</td>
                <td>${new Date(item.borrowed_at).toLocaleString()}</td>
                <td>${dueDate.toLocaleString()}<br>${timerDisplay}</td>
                <td>
                    <span class="badge status-badge ${statusClass[item.return_status]}">${item.return_status}</span>
                    ${item.justification ? `<br><small class="text-muted"><strong>Reason:</strong> ${item.justification}</small>` : ''}
                </td>
                <td>${item.expected_samples}</td>
                <td>${item.returned_samples || '-'}</td>
                <td>${actions || '-'}</td>
            `;

            tbody.appendChild(row);
        });
    }

    generateDefectCountInputs() {
        const container = document.getElementById('defectCountsContainer');
        const defectTypes = [
            'Dummyunit', 'WhiteFM(Substrate)', 'BlackFM(Substrate)', 'Chip(Substrate)', 'Scratches(Substrate)',
            'Crack(Substrate)', 'FMonFoot(Substrate)', 'FMonShoulder(Substrate)', 'NFA(Substrate)', 'PFA(Substrate)',
            'Footburr(Substrate)', 'Shoulderbur(Substrate)', 'Exposecopper(Substrate)', 'Resinbleed(Substrate)',
            'void(Substrate)', 'Copla(Substrate)', 'WhiteFM(Mold/MetalLid)', 'BlackFM(Mold/MetalLid)', 'EdgeChip(Mold/MetalLid)', 'CornerChip(Mold/MetalLid)',
            'Scratches(Mold/MetalLid)', 'Crack(Mold/MetalLid)', 'Illegiblemarking(Mold/MetalLid)', 'WhiteFM(Die)', 'BlackFM(Die)', 'Chip(Die)',
            'Scratches(Die)', 'Crack(Die)', 'WhiteFM(BottomDefect)', 'BlackFM(BottomDefect)', 'Chip(BottomDefect)', 'Scratches(BottomDefect)',
            'Crack(BottomDefect)', 'Damageball(BottomDefect)', 'Multiple Defect', 'Pitch', 'Sliver', 'Ball Discoloration',
            'Burr', 'FM on Dambar', 'FM on Lead', 'Expose Copper on Dambar', 'Mold Flash', 'Metallic Particle',
            'Patchback', 'Bent Lead', 'Expose Tie Bar', 'Fiber', 'Tool Mark', 'Good Unit', 'Lead Shining', 'Acid Test Burr'
        ];

        defectTypes.forEach(type => {
            const col = document.createElement('div');
            col.className = 'col-md-3 col-sm-6';

            const label = type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

            col.innerHTML = `
                <div class="mb-2">
                    <label class="form-label small">${label}</label>
                    <input type="number" class="form-control form-control-sm defect-count-input"
                           id="${type}" name="${type}" min="0" value="0">
                </div>
            `;

            container.appendChild(col);
        });
    }

    calculateTotalSamples() {
        const inputs = document.querySelectorAll('.defect-count-input');
        let total = 0;

        inputs.forEach(input => {
            total += parseInt(input.value) || 0;
        });

        document.getElementById('totalSamples').value = total;
    }

    async deletePackage(packageId) {
        // Check if user is admin
        if (this.user.role !== 'Admin') {
            this.showAlert('Only administrators can delete packages', 'error');
            return;
        }

        // Find the package to get its details for confirmation
        const packageToDelete = (this.allPackages || this.packages).find(pkg =>
            pkg.ID == packageId || pkg.ID == parseInt(packageId)
        );

        if (!packageToDelete) {
            this.showAlert('Package not found', 'error');
            return;
        }

        // Show confirmation dialog
        const confirmMessage = `Are you sure you want to delete package "${packageToDelete.Packagecode}"?\n\nThis action cannot be undone.`;
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const result = await this.apiCall(`/packages/${packageId}`, 'DELETE');
            if (result) {
                this.showAlert('Package deleted successfully!', 'success');
                this.loadPackages(); // Refresh the package list
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showAlert('Failed to delete package', 'error');
        }
    }

    async handleAddItem(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        if (!data.temporaryCabinet || !data.temporaryCabinet.match(/^C\d+-S\d+$/)) {
            this.showAlert('Temporary Cabinet must follow format CX-SXX', 'danger');
            return;
        }

        const result = await this.apiCall('/packages', 'POST', data);

        if (result) {
            this.showAlert('Package added successfully!', 'success');
            e.target.reset();
            this.calculateTotalSamples();
            this.loadPackages();
            // Redirect to dashboard after successful addition
            setTimeout(() => {
                const dashboardTab = document.getElementById('dashboard-tab');
                if (dashboardTab) {
                    dashboardTab.click();
                }
            }, 1500); // Wait 1.5 seconds to show the success message
        }
    }

    async showBorrowModal(packageId) {
        try {
            // Find package first
            const packageToBorrow = (this.allPackages || this.packages).find(pkg =>
                pkg.ID == packageId || pkg.ID == parseInt(packageId)
            );
            
            if (!packageToBorrow) {
                this.showAlert('Package not found', 'error');
                return;
            }

            // Get modal element
            const modalElement = document.getElementById('borrowModal');
            if (!modalElement) {
                console.error('Borrow modal element not found');
                this.showAlert('Error opening borrow modal', 'error');
                return;
            }

            // Initialize modal instance
            const modal = bootstrap.Modal.getInstance(modalElement) || 
                new bootstrap.Modal(modalElement, {
                    backdrop: 'static',
                    keyboard: false
                });

            // Show modal first
            modal.show();

            // After modal is shown, populate the data
            setTimeout(async () => {
                try {
                    // Load verifiers
                    await this.loadVerifiers();

                    // Get form elements
                    const borrowPackageIdElement = document.getElementById('borrowPackageId');
                    const verifierSelectElement = document.getElementById('verifierSelect');
                    const borrowPackageDetailsElement = document.getElementById('borrowPackageDetails');

                    if (!borrowPackageIdElement || !verifierSelectElement || !borrowPackageDetailsElement) {
                        console.error('Required form elements not found');
                        modal.hide();
                        this.showAlert('Error initializing borrow form', 'error');
                        return;
                    }

                    // Populate form
                    borrowPackageIdElement.value = packageId;
                    verifierSelectElement.value = '';
                    borrowPackageDetailsElement.innerHTML = `
                        <strong>Package:</strong> ${packageToBorrow.Packagecode}<br>
                        <strong>Description:</strong> ${packageToBorrow.Packagedescription}<br>
                        <strong>Total Samples:</strong> ${packageToBorrow.TotalSample}
                    `;

                } catch (error) {
                    console.error('Error loading form data:', error);
                    modal.hide();
                    this.showAlert('Error loading form data', 'error');
                }
            }, 100); // Short delay to ensure modal is shown

        } catch (error) {
            console.error('Error in showBorrowModal:', error);
            this.showAlert('Error opening borrow modal', 'error');
        }

        borrowPackageIdElement.value = packageId;
        verifierSelectElement.value = '';
        borrowPackageDetailsElement.innerHTML = `
            <strong>Package:</strong> ${pkg.Packagecode}<br>
            <strong>Description:</strong> ${pkg.Packagedescription}<br>
            <strong>Total Samples:</strong> ${pkg.TotalSample}
        `;
    }

    async submitBorrow() {
        console.log('submitBorrow called');
        
        const packageId = document.getElementById('borrowPackageId').value;
        const verifierId = document.getElementById('verifierSelect').value;

        console.log('Borrow form data:', { packageId, verifierId });

        if (!verifierId) {
            console.log('No verifier selected');
            this.showAlert('Please select a verifier', 'danger');
            return;
        }

        const result = await this.apiCall('/borrow', 'POST', { packageId, verifierId });

        if (result) {
            console.log('Borrow successful');
            this.showAlert('Package borrowed successfully!', 'success');

            // Properly close the modal
            try {
                const modalElement = document.getElementById('borrowModal');
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    console.log('Hiding borrow modal');
                    modal.hide();
                }
            } catch (error) {
                console.error('Error hiding borrow modal:', error);
            }

            // Reset form after successful submission
            const packageIdEl = document.getElementById('borrowPackageId');
            const verifierSelectEl = document.getElementById('verifierSelect');
            const packageDetailsEl = document.getElementById('borrowPackageDetails');

            if (packageIdEl) packageIdEl.value = '';
            if (verifierSelectEl) verifierSelectEl.value = '';
            if (packageDetailsEl) packageDetailsEl.innerHTML = '';

            // Refresh data with slight delay to ensure proper state update
            setTimeout(() => {
                this.loadPackages();
                this.loadBorrowHistory();
            }, 100);
        } else {
            console.log('Borrow failed');
        }
    }

    async returnItem(borrowId) {
        if (!confirm('Are you sure you want to return this item?')) return;

        const result = await this.apiCall(`/return/${borrowId}`, 'POST');

        if (result) {
            this.showAlert('Return initiated successfully!', 'success');
            this.loadBorrowHistory();
        }
    }

    async showVerifyReturnModal(borrowId) {
        try {
            const borrowIdNum = parseInt(borrowId);

            // Ensure borrowHistory is loaded
            if (!this.borrowHistory || this.borrowHistory.length === 0) {
                await this.loadBorrowHistory();
            }

            const item = this.borrowHistory.find(i =>
                i.ID === borrowIdNum || i.ID === borrowId ||
                parseInt(i.ID) === borrowIdNum
            );

            if (!item) {
                console.error('Borrow item not found:', borrowId, 'Available items:', this.borrowHistory);
                this.showAlert('Item not found', 'error');
                return;
            }

            // Clear previous values
            document.getElementById('returnedSamples').value = '';
            document.getElementById('justification').value = '';

            // Set values
            document.getElementById('verifyBorrowId').value = borrowId;
            document.getElementById('expectedSamples').innerHTML = `Expected: ${item.expected_samples || 0} samples`;

            const modalElement = document.getElementById('verifyReturnModal');
            if (!modalElement) {
                console.error('Verify return modal element not found');
                this.showAlert('Error opening verification modal', 'error');
                return;
            }

            try {
                let modal = bootstrap.Modal.getInstance(modalElement);
                if (!modal) {
                    modal = new bootstrap.Modal(modalElement, {
                        backdrop: 'static',
                        keyboard: false
                    });
                }
                
                setTimeout(() => {
                    modal.show();
                }, 10);
            } catch (error) {
                console.error('Error showing verify return modal:', error);
                this.showAlert('Error opening verification modal', 'error');
            }
        } catch (error) {
            console.error('Error showing verify modal:', error);
            this.showAlert('Error opening verification modal', 'error');
        }
    }

    async submitVerifyReturn() {
        try {
            const borrowId = document.getElementById('verifyBorrowId').value;
            const returnedSamples = document.getElementById('returnedSamples').value;
            const justification = document.getElementById('justification').value;

            if (!borrowId) {
                this.showAlert('Invalid verification request', 'error');
                return;
            }

            if (!returnedSamples || returnedSamples === '') {
                this.showAlert('Please enter the number of returned samples', 'warning');
                return;
            }

            if (parseInt(returnedSamples) < 0) {
                this.showAlert('Returned samples cannot be negative', 'warning');
                return;
            }

            // Get expected samples to check if justification is required
            const expectedText = document.getElementById('expectedSamples').textContent;
            const expectedSamples = parseInt(expectedText.match(/\d+/)[0]);
            const returnedSamplesNum = parseInt(returnedSamples);

            // Require justification if returned samples don't match expected
            if (returnedSamplesNum !== expectedSamples && (!justification || justification.trim() === '')) {
                this.showAlert('Justification is required when returned samples differ from expected samples', 'warning');
                document.getElementById('justification').focus();
                return;
            }

            // Show loading state
            const submitBtn = document.getElementById('submitVerifyReturnBtn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Verifying...';
            submitBtn.disabled = true;

            const result = await this.apiCall(`/verify-return/${borrowId}`, 'POST', {
                returnedSamples: returnedSamplesNum,
                justification: justification || ''
            });

            // Reset button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

            if (result) {
                this.showAlert('Return verified successfully!', 'success');

                // Hide modal
                try {
                    const modalElement = document.getElementById('verifyReturnModal');
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    if (modalInstance) {
                        modalInstance.hide();
                    }
                } catch (error) {
                    console.error('Error hiding verify return modal:', error);
                }

                // Clear form
                document.getElementById('returnedSamples').value = '';
                document.getElementById('justification').value = '';
                document.getElementById('verifyBorrowId').value = '';

                // Reload data
                setTimeout(() => {
                    this.loadBorrowHistory();
                    this.loadPackages();
                }, 100);
            }
        } catch (error) {
            console.error('Error verifying return:', error);
            this.showAlert('Error verifying return', 'error');

            // Reset button state on error
            const submitBtn = document.getElementById('submitVerifyReturnBtn');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Verify Return';
                submitBtn.disabled = false;
            }
        }
    }

    applyFilters() {
        if (!this.allPackages) {
            this.allPackages = [...this.packages];
        }

        const packageCode = document.getElementById('filterPackageCode')?.value.toLowerCase() || '';
        const category = document.getElementById('filterCategory')?.value || '';
        const shift = document.getElementById('filterShift')?.value || '';
        const available = document.getElementById('filterAvailable')?.value || '';

        const filtered = this.allPackages.filter(pkg => {
            const matchesCode = !packageCode || (pkg.Packagecode || '').toLowerCase().includes(packageCode);
            const matchesCategory = !category || pkg.Category === category;
            const matchesShift = !shift || pkg['SampleCreatedByShift(A/B/C)'] === shift;
            const matchesAvailable = !available || pkg['MATERIAL AT ENG ROOM'] === available;

            return matchesCode && matchesCategory && matchesShift && matchesAvailable;
        });

        this.packages = filtered;
        this.renderPackagesTable();
    }

    toggleFilters() {
        const container = document.getElementById('filtersContainer');
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }

    refreshPackages() {
        // Reset filters
        const filterInputs = ['filterPackageCode', 'filterCategory', 'filterShift', 'filterAvailable'];
        filterInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });

        // Reload packages
        this.loadPackages();
    }

    async editPackage(packageId) {
        try {
            // Find the package to edit from the full packages array (not filtered)
            // Convert packageId to number for comparison
            const numPackageId = parseInt(packageId);
            const packageToEdit = (this.allPackages || this.packages).find(pkg =>
                pkg.ID == packageId || pkg.ID == numPackageId
            );
            if (!packageToEdit) {
                this.showAlert('Package not found', 'error');
                return;
            }

            // Debug logs removed - field names now match database

            // Load categories and generate defect count inputs first
            await this.loadEditFormOptions();
            this.generateEditDefectCountInputs();

            // Then populate the form with data
            document.getElementById('editPackageId').value = packageToEdit.ID;
            document.getElementById('editPackageCode').value = packageToEdit.Packagecode || packageToEdit.PackageCode || '';
            document.getElementById('editTemporaryCabinet').value = packageToEdit['Temporary Cabinet'] || packageToEdit.TemporaryCabinet || '';
            document.getElementById('editPackageDescription').value = packageToEdit.Packagedescription || packageToEdit.PackageDescription || '';

            // Set category after options are loaded
            setTimeout(() => {
                document.getElementById('editCategory').value = packageToEdit.Category || '';
            }, 100);

            document.getElementById('editSampleCreatedByShift').value = packageToEdit['SampleCreatedByShift(A/B/C)'] || packageToEdit.SampleCreatedByShift || '';

            // Populate defect counts
            const defectCountsContainer = document.getElementById('editDefectCountsContainer');
            const defectInputs = defectCountsContainer.querySelectorAll('input[type="number"]');

            defectInputs.forEach(input => {
                const defectType = input.name; // Use the name attribute which contains the actual field name
                const value = packageToEdit[defectType];

                if (value !== undefined && value !== null) {
                    input.value = value;
                } else {
                    input.value = 0;
                }
            });

            // Calculate total samples
            this.calculateEditTotalSamples();

            // Show the modal
            const modalElement = document.getElementById('editModal');
            if (!modalElement) {
                console.error('Edit modal element not found');
                this.showAlert('Error opening edit modal', 'error');
                return;
            }

            try {
                let modal = bootstrap.Modal.getInstance(modalElement);
                if (!modal) {
                    modal = new bootstrap.Modal(modalElement, {
                        backdrop: 'static',
                        keyboard: false
                    });
                }
                
                setTimeout(() => {
                    modal.show();
                }, 10);
            } catch (error) {
                console.error('Error showing edit modal:', error);
                this.showAlert('Error opening edit modal', 'error');
            }

        } catch (error) {
            console.error('Error loading package for edit:', error);
            this.showAlert('Error loading package details', 'error');
        }
    }

    async loadEditFormOptions() {
        try {
            const response = await fetch(`${this.API_BASE}/packages/options`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const options = await response.json();

            // Populate categories
            const categorySelect = document.getElementById('editCategory');
            categorySelect.innerHTML = '<option value="">Select Category</option>';
            options.categories.forEach(category => {
                categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
            });
        } catch (error) {
            console.error('Error loading edit form options:', error);
        }
    }

    generateEditDefectCountInputs() {
        const container = document.getElementById('editDefectCountsContainer');
        container.innerHTML = '';

        const defectTypes = [
            'Dummyunit', 'WhiteFM(Substrate)', 'BlackFM(Substrate)', 'Chip(Substrate)', 'Scratches(Substrate)',
            'Crack(Substrate)', 'FMonFoot(Substrate)', 'FMonShoulder(Substrate)', 'NFA(Substrate)', 'PFA(Substrate)',
            'Footburr(Substrate)', 'Shoulderbur(Substrate)', 'Exposecopper(Substrate)', 'Resinbleed(Substrate)',
            'void(Substrate)', 'Copla(Substrate)', 'WhiteFM(Mold/MetalLid)', 'BlackFM(Mold/MetalLid)', 'EdgeChip(Mold/MetalLid)', 'CornerChip(Mold/MetalLid)',
            'Scratches(Mold/MetalLid)', 'Crack(Mold/MetalLid)', 'Illegiblemarking(Mold/MetalLid)', 'WhiteFM(Die)', 'BlackFM(Die)', 'Chip(Die)',
            'Scratches(Die)', 'Crack(Die)', 'WhiteFM(BottomDefect)', 'BlackFM(BottomDefect)', 'Chip(BottomDefect)', 'Scratches(BottomDefect)',
            'Crack(BottomDefect)', 'Damageball(BottomDefect)', 'Multiple Defect', 'Pitch', 'Sliver', 'Ball Discoloration',
            'Burr', 'FM on Dambar', 'FM on Lead', 'Expose Copper on Dambar', 'Mold Flash', 'Metallic Particle',
            'Patchback', 'Bent Lead', 'Expose Tie Bar', 'Fiber', 'Tool Mark', 'Good Unit', 'Lead Shining', 'Acid Test Burr'
        ];

        defectTypes.forEach(type => {
            const col = document.createElement('div');
            col.className = 'col-md-3 col-sm-6';

            const label = type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

            col.innerHTML = `
                <div class="mb-2">
                    <label class="form-label small">${label}</label>
                    <input type="number" class="form-control form-control-sm edit-defect-input"
                           id="edit${type}" name="${type}" min="0" value="0">
                </div>
            `;
            container.appendChild(col);
        });
    }

    calculateEditTotalSamples() {
        const container = document.getElementById('editDefectCountsContainer');
        const inputs = container.querySelectorAll('input[type="number"]');
        let total = 0;

        inputs.forEach(input => {
            total += parseInt(input.value) || 0;
        });

        document.getElementById('editTotalSamples').value = total;
    }

    async submitEditPackage() {
        try {
            const packageId = document.getElementById('editPackageId').value;
            const packageCode = document.getElementById('editPackageCode').value.trim();
            const temporaryCabinet = document.getElementById('editTemporaryCabinet').value.trim();
            const packageDescription = document.getElementById('editPackageDescription').value.trim();
            const category = document.getElementById('editCategory').value;
            const sampleCreatedByShift = document.getElementById('editSampleCreatedByShift').value;

            if (!packageCode || !temporaryCabinet || !category || !sampleCreatedByShift) {
                this.showAlert('Please fill in all required fields', 'error');
                return;
            }

            // Get defect counts
            const defectCounts = {};
            const container = document.getElementById('editDefectCountsContainer');
            const inputs = container.querySelectorAll('input[type="number"]');

            inputs.forEach(input => {
                const defectType = input.name; // Use the name attribute which contains the actual field name
                defectCounts[defectType] = parseInt(input.value) || 0;
            });

            const updateData = {
                Packagecode: packageCode,
                'Temporary Cabinet': temporaryCabinet,
                Packagedescription: packageDescription,
                Category: category,
                'SampleCreatedByShift(A/B/C)': sampleCreatedByShift,
                ...defectCounts
            };

            const response = await fetch(`${this.API_BASE}/packages/${packageId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                this.showAlert('Package updated successfully!', 'success');

                // Hide the modal
                try {
                    const editModal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
                    if (editModal) {
                        editModal.hide();
                    }
                } catch (error) {
                    console.error('Error hiding edit modal:', error);
                }

                // Reload packages to show updated data
                this.loadPackages();
            } else {
                const errorData = await response.json();
                this.showAlert(errorData.message || 'Error updating package', 'error');
            }

        } catch (error) {
            console.error('Error updating package:', error);
            this.showAlert('Error updating package', 'error');
        }
    }

    viewPackageDetails(packageId) {
        try {
            // Find the package to view
            const packageToView = (this.allPackages || this.packages).find(pkg =>
                pkg.ID == packageId || pkg.ID == parseInt(packageId)
            );

            if (!packageToView) {
                this.showAlert('Package not found', 'error');
                return;
            }

            // Populate basic information
            document.getElementById('viewPackageId').textContent = packageToView.ID;
            document.getElementById('viewPackageCode').textContent = packageToView.Packagecode || '';
            document.getElementById('viewPackageDescription').textContent = packageToView.Packagedescription || '';
            document.getElementById('viewTemporaryCabinet').textContent = packageToView['Temporary Cabinet'] || '';
            document.getElementById('viewCategory').textContent = packageToView.Category || '';
            document.getElementById('viewShift').textContent = packageToView['SampleCreatedByShift(A/B/C)'] || '';

            // Set availability with badge
            const availabilityElement = document.getElementById('viewAvailability');
            if (packageToView['MATERIAL AT ENG ROOM'] === 'YES') {
                availabilityElement.innerHTML = '<span class="badge bg-success">Available</span>';
            } else {
                availabilityElement.innerHTML = '<span class="badge bg-danger">Not Available</span>';
            }

            document.getElementById('viewTotalSamples').textContent = packageToView.TotalSample || 0;

            // Populate defect counts
            this.populateViewDefectCounts(packageToView);

            // Show the modal
            const modalElement = document.getElementById('viewDetailsModal');
            if (!modalElement) {
                console.error('View details modal element not found');
                this.showAlert('Error opening view details modal', 'error');
                return;
            }

            try {
                let modal = bootstrap.Modal.getInstance(modalElement);
                if (!modal) {
                    modal = new bootstrap.Modal(modalElement, {
                        backdrop: 'static',
                        keyboard: true
                    });
                }
                
                setTimeout(() => {
                    modal.show();
                }, 10);
            } catch (error) {
                console.error('Error showing view details modal:', error);
                this.showAlert('Error opening view details modal', 'error');
            }

        } catch (error) {
            console.error('Error loading package details:', error);
            this.showAlert('Error loading package details', 'error');
        }
    }

    populateViewDefectCounts(packageData) {
        const container = document.getElementById('viewDefectCountsContainer');
        container.innerHTML = '';

        const defectTypes = [
            'Dummyunit', 'WhiteFM(Substrate)', 'BlackFM(Substrate)', 'Chip(Substrate)', 'Scratches(Substrate)',
            'Crack(Substrate)', 'FMonFoot(Substrate)', 'FMonShoulder(Substrate)', 'NFA(Substrate)', 'PFA(Substrate)',
            'Footburr(Substrate)', 'Shoulderbur(Substrate)', 'Exposecopper(Substrate)', 'Resinbleed(Substrate)',
            'void(Substrate)', 'Copla(Substrate)', 'WhiteFM(Mold/MetalLid)', 'BlackFM(Mold/MetalLid)', 'EdgeChip(Mold/MetalLid)', 'CornerChip(Mold/MetalLid)',
            'Scratches(Mold/MetalLid)', 'Crack(Mold/MetalLid)', 'Illegiblemarking(Mold/MetalLid)', 'WhiteFM(Die)', 'BlackFM(Die)', 'Chip(Die)',
            'Scratches(Die)', 'Crack(Die)', 'WhiteFM(BottomDefect)', 'BlackFM(BottomDefect)', 'Chip(BottomDefect)', 'Scratches(BottomDefect)',
            'Crack(BottomDefect)', 'Damageball(BottomDefect)', 'Multiple Defect', 'Pitch', 'Sliver', 'Ball Discoloration',
            'Burr', 'FM on Dambar', 'FM on Lead', 'Expose Copper on Dambar', 'Mold Flash', 'Metallic Particle',
            'Patchback', 'Bent Lead', 'Expose Tie Bar', 'Fiber', 'Tool Mark', 'Good Unit', 'Lead Shining', 'Acid Test Burr'
        ];

        defectTypes.forEach(type => {
            const value = packageData[type] || 0;
            const label = type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

            // Only show defects with values > 0 or show all with different styling
            const col = document.createElement('div');
            col.className = 'col-md-6 col-sm-12';

            const badgeClass = value > 0 ? 'bg-warning text-dark' : 'bg-light text-muted';

            col.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-1 p-1 border-bottom">
                    <small class="text-muted">${label}</small>
                    <span class="badge ${badgeClass}">${value}</span>
                </div>
            `;

            container.appendChild(col);
        });
    }

    showAlert(message, type = 'info') {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show position-fixed"
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', alertHtml);

        setTimeout(() => {
            const alert = document.querySelector('.alert:last-of-type');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}

// Global error handler to catch any suppressed errors
window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    console.error('Error message:', event.message);
    console.error('Error filename:', event.filename);
    console.error('Error lineno:', event.lineno);
    console.error('Error colno:', event.colno);
});

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - initializing StorageManager');
    
    // Check if Bootstrap is available
    console.log('Bootstrap available:', typeof bootstrap !== 'undefined');
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap is not loaded! Modal functionality will not work.');
    }
    
    const storageManager = new StorageManager();
    
    // Global functions for HTML onclick handlers
    window.logout = function() {
        console.log('Global logout function called');
        storageManager.logout();
    }

    window.toggleFilters = function() {
        console.log('Global toggleFilters function called');
        storageManager.toggleFilters();
    }

    window.refreshPackages = function() {
        console.log('Global refreshPackages function called');
        storageManager.refreshPackages();
    }

    window.submitBorrow = function() {
        console.log('Global submitBorrow function called');
        storageManager.submitBorrow();
    }

    window.submitVerifyReturn = function() {
        console.log('Global submitVerifyReturn function called');
        storageManager.submitVerifyReturn();
    }

    // Add missing global functions that are called from HTML onclick handlers
    window.storageManager = storageManager;
});

// Fallback initialization if DOMContentLoaded already fired
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Initialization handled above
    });
} else {
    // DOM is already loaded, initialize immediately
    console.log('DOM already loaded - initializing StorageManager immediately');
    
    // Check if Bootstrap is available
    console.log('Bootstrap available (immediate):', typeof bootstrap !== 'undefined');
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap is not loaded (immediate)! Modal functionality will not work.');
    }
    
    const storageManager = new StorageManager();
    
    window.logout = function() {
        console.log('Global logout function called (immediate)');
        storageManager.logout();
    }

    window.toggleFilters = function() {
        console.log('Global toggleFilters function called (immediate)');
        storageManager.toggleFilters();
    }

    window.refreshPackages = function() {
        console.log('Global refreshPackages function called (immediate)');
        storageManager.refreshPackages();
    }

    window.submitBorrow = function() {
        console.log('Global submitBorrow function called (immediate)');
        storageManager.submitBorrow();
    }

    window.submitVerifyReturn = function() {
        console.log('Global submitVerifyReturn function called (immediate)');
        storageManager.submitVerifyReturn();
    }

    window.storageManager = storageManager;
}