/**
 * TransitionOverlay - Fullscreen fade transition overlay
 * 
 * Creates smooth fade transitions when switching between podules.
 * Black overlay that fades in/out with configurable duration.
 */
export class TransitionOverlay {
    private overlay: HTMLDivElement;
    private duration: number;

    constructor(duration: number = 300) {
        this.duration = duration;
        this.overlay = this.createOverlay();
        document.body.appendChild(this.overlay);
    }

    /**
     * Create the overlay DOM element
     */
    private createOverlay(): HTMLDivElement {
        const div = document.createElement('div');
        div.className = 'transition-overlay';
        div.style.opacity = '0';
        div.style.pointerEvents = 'none';
        return div;
    }

    /**
     * Fade to black (opacity 0 → 1)
     * @returns Promise that resolves when fade is complete
     */
    public fadeOut(): Promise<void> {
        return new Promise(resolve => {
            this.overlay.style.pointerEvents = 'auto';
            this.overlay.style.transition = `opacity ${this.duration}ms ease-in-out`;
            this.overlay.style.opacity = '1';

            setTimeout(() => {
                resolve();
            }, this.duration);
        });
    }

    /**
     * Fade from black (opacity 1 → 0)
     * @returns Promise that resolves when fade is complete
     */
    public fadeIn(): Promise<void> {
        return new Promise(resolve => {
            this.overlay.style.transition = `opacity ${this.duration}ms ease-in-out`;
            this.overlay.style.opacity = '0';

            setTimeout(() => {
                this.overlay.style.pointerEvents = 'none';
                resolve();
            }, this.duration);
        });
    }

    /**
     * Perform a complete transition (fade out, execute callback, fade in)
     */
    public async transition(callback: () => void): Promise<void> {
        await this.fadeOut();
        callback();
        await this.fadeIn();
    }

    /**
     * Clean up the overlay
     */
    public dispose(): void {
        this.overlay.remove();
    }
}

