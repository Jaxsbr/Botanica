/**
 * DebugCommands - Development/testing keyboard shortcuts
 * 
 * Provides debug commands for testing and development:
 * - T key: Reset all localStorage (tutorial, inventory, economy, etc.)
 */

export class DebugCommands {
    private static instance: DebugCommands;
    private boundKeyDown: (event: KeyboardEvent) => void;

    private constructor() {
        this.boundKeyDown = this.onKeyDown.bind(this);
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): DebugCommands {
        if (!DebugCommands.instance) {
            DebugCommands.instance = new DebugCommands();
        }
        return DebugCommands.instance;
    }

    /**
     * Initialize debug commands
     */
    public init(): void {
        window.addEventListener('keydown', this.boundKeyDown);
        console.log('🐛 Debug commands initialized (Press T to reset localStorage)');
    }

    /**
     * Clean up debug commands
     */
    public dispose(): void {
        window.removeEventListener('keydown', this.boundKeyDown);
        console.log('🐛 Debug commands disposed');
    }

    /**
     * Handle key down events
     */
    private onKeyDown(event: KeyboardEvent): void {
        // Ignore if user is typing in an input field
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }

        // T key - Reset localStorage
        if (event.key === 't' || event.key === 'T') {
            this.resetLocalStorage();
        }
    }

    /**
     * Reset all localStorage with confirmation
     */
    private resetLocalStorage(): void {
        const confirmed = window.confirm(
            '⚠️ DEBUG: Reset All Data?\n\n' +
            'This will clear:\n' +
            '- Tutorial progress\n' +
            '- Inventory items\n' +
            '- Money/economy\n' +
            '- Placed pots and plants\n' +
            '- Time speed settings\n\n' +
            'The page will need to be refreshed after clearing.\n\n' +
            'Are you sure?'
        );

        if (confirmed) {
            console.log('🐛 Clearing all localStorage...');

            // Get all keys before clearing
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) keys.push(key);
            }

            // Clear everything
            localStorage.clear();

            console.log(`🐛 Cleared ${keys.length} localStorage items:`, keys);

            // Inform user to refresh
            alert(
                '✅ All data cleared!\n\n' +
                'Please refresh the page (F5 or Cmd+R) to restart with fresh data.\n\n' +
                'The tutorial will appear for new players.'
            );
        } else {
            console.log('🐛 localStorage reset cancelled');
        }
    }

    /**
     * Show debug help in console
     */
    public showHelp(): void {
        console.log('🐛 Debug Commands:');
        console.log('  T - Reset all localStorage (clear all game data)');
    }
}

