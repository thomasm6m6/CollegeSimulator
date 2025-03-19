export class UIManager {
    constructor() {
        // UI Elements
        this.settingsBtn = document.getElementById('settings-btn');
        this.aboutBtn = document.getElementById('about-btn');
        this.settingsModal = document.getElementById('settings-modal');
        this.aboutModal = document.getElementById('about-modal');
        this.closeSettings = document.getElementById('close-settings');
        this.closeAbout = document.getElementById('close-about');
        this.backdrop = document.getElementById('backdrop');
        this.topButtons = document.querySelector('.top-buttons');

        // Game settings
        this.adultContent = document.getElementById('adult-content');
        this.roleSwitch = document.getElementById('role-switch');

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Settings button
        this.settingsBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleModal(
                this.settingsModal,
                this.aboutModal,
                !this.settingsModal.classList.contains('active')
            );
        });

        // About button
        this.aboutBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleModal(
                this.aboutModal,
                this.settingsModal,
                !this.aboutModal.classList.contains('active')
            );
        });

        // Close buttons
        this.closeSettings.addEventListener('click', () => {
            this.toggleModal(this.settingsModal, this.aboutModal, false);
        });

        this.closeAbout.addEventListener('click', () => {
            this.toggleModal(this.aboutModal, this.settingsModal, false);
        });

        // Backdrop click
        this.backdrop.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleModal(this.settingsModal, this.aboutModal, false);
            this.toggleModal(this.aboutModal, this.settingsModal, false);
        });

        // Prevent clicks inside modals from closing
        this.settingsModal.addEventListener('click', (event) => event.stopPropagation());
        this.aboutModal.addEventListener('click', (event) => event.stopPropagation());

        // Settings change handlers
        this.adultContent.addEventListener('change', this.handleAdultContentChange.bind(this));
        this.roleSwitch.addEventListener('change', this.handleRoleChange.bind(this));
    }

    toggleModal(modal, otherModal, show) {
        if (show) {
            modal.classList.add('active');
            this.backdrop.classList.add('active');
            otherModal.classList.remove('active');
        } else {
            modal.classList.remove('active');
            this.backdrop.classList.remove('active');
        }
    }

    handleAdultContentChange(event) {
        // Handle adult content toggle
        const enabled = event.target.checked;
        console.log(`Adult content ${enabled ? 'enabled' : 'disabled'}`);
        // Would trigger game event or state change here
    }

    handleRoleChange(event) {
        // Handle role switch
        const role = event.target.value;
        console.log(`Role changed to ${role}`);
        // Would trigger game event or state change here
    }
}