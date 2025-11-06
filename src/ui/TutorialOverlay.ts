/**
 * TutorialOverlay - Tutorial UI with step-by-step instructions
 * 
 * Displays tutorial messages and guides player through initial planting workflow.
 * Automatically hides when tutorial is completed.
 */

import { TutorialSystem, TutorialStep } from '../systems/TutorialSystem';
import type { InputManager } from '../systems/InputManager';

export class TutorialOverlay {
    private container: HTMLDivElement;
    private contentDiv: HTMLDivElement;
    private tutorialSystem: TutorialSystem;
    private inputManager: InputManager;
    private visible: boolean = false;

    constructor(inputManager: InputManager) {
        this.tutorialSystem = TutorialSystem.getInstance();
        this.inputManager = inputManager;
        this.container = this.createOverlay();
        this.contentDiv = this.container.querySelector('.tutorial-content') as HTMLDivElement;

        // Subscribe to tutorial step changes
        this.tutorialSystem.subscribe((step) => this.updateContent(step));

        // Only show tutorial if not completed and not on COMPLETE step
        // (prevents showing completion message on page reload)
        const currentStep = this.tutorialSystem.getCurrentStep();
        if (!this.tutorialSystem.isCompleted() && currentStep !== TutorialStep.COMPLETE) {
            const shouldBlock = this.shouldBlockInteractions(currentStep);
            this.show(shouldBlock);
        }
    }

    /**
     * Create the tutorial overlay DOM structure
     */
    private createOverlay(): HTMLDivElement {
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            border: 2px solid #4CAF50;
            max-width: 500px;
            z-index: 1000;
            font-family: Arial, sans-serif;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            display: none;
            animation: slideDown 0.3s ease-out;
            pointer-events: auto;
        `;

        // Prevent clicks from passing through to 3D world
        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Add animation keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
            
            .tutorial-overlay h2 {
                margin: 0 0 10px 0;
                color: #4CAF50;
                font-size: 24px;
            }
            
            .tutorial-overlay p {
                margin: 8px 0;
                line-height: 1.5;
                font-size: 16px;
            }
            
            .tutorial-overlay .tutorial-buttons {
                margin-top: 15px;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            
            .tutorial-overlay button {
                padding: 8px 16px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                transition: background 0.2s;
            }
            
            .tutorial-overlay button:hover {
                background: #45a049;
            }
            
            .tutorial-overlay button.secondary {
                background: #666;
            }
            
            .tutorial-overlay button.secondary:hover {
                background: #555;
            }
        `;
        document.head.appendChild(style);

        // Content container
        const content = document.createElement('div');
        content.className = 'tutorial-content';
        overlay.appendChild(content);

        // Button container
        const buttons = document.createElement('div');
        buttons.className = 'tutorial-buttons';
        overlay.appendChild(buttons);

        // Skip button (only show on welcome step)
        const skipBtn = document.createElement('button');
        skipBtn.className = 'secondary';
        skipBtn.textContent = 'Skip Tutorial';
        skipBtn.onclick = () => this.skip();
        buttons.appendChild(skipBtn);

        // Next/Continue button
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Continue';
        nextBtn.onclick = () => this.next();
        buttons.appendChild(nextBtn);

        document.body.appendChild(overlay);
        return overlay;
    }

    /**
     * Update tutorial content based on current step
     */
    private updateContent(step: TutorialStep): void {
        const skipBtn = this.container.querySelector('button.secondary') as HTMLButtonElement;
        const nextBtn = this.container.querySelector('button:not(.secondary)') as HTMLButtonElement;

        // Don't show COMPLETE step if tutorial was already completed
        // (prevents showing completion popup on page reload)
        if (step === TutorialStep.COMPLETE && this.tutorialSystem.isCompleted() && !this.visible) {
            return;
        }

        // Determine if this step should block 3D interactions
        const shouldBlockInteractions = this.shouldBlockInteractions(step);

        switch (step) {
            case TutorialStep.WELCOME:
                this.contentDiv.innerHTML = `
                    <h2>🌿 Welcome to Botanica!</h2>
                    <p>Your grandmother has given you a young avocado plant, a pot, and some soil to get you started.</p>
                    <p>Let's learn how to plant your first tree!</p>
                `;
                skipBtn.style.display = 'block';
                nextBtn.textContent = 'Start Tutorial';
                this.show(shouldBlockInteractions);
                break;

            case TutorialStep.PLACE_POT:
                this.contentDiv.innerHTML = `
                    <h2>Step 1: Place Your Pot</h2>
                    <p>Click on one of the paver stones in your garden to place a pot.</p>
                    <p>The pot is already in your inventory - just choose where to put it!</p>
                `;
                skipBtn.style.display = 'none';
                nextBtn.style.display = 'none';
                this.show(shouldBlockInteractions);
                break;

            case TutorialStep.ADD_SOIL:
                this.contentDiv.innerHTML = `
                    <h2>Step 2: Add Soil</h2>
                    <p>Great! Now click on your empty pot and select the soil to fill it.</p>
                    <p>Different soils have different drainage properties - this one is perfect for starting out.</p>
                `;
                skipBtn.style.display = 'none';
                nextBtn.style.display = 'none';
                this.show(shouldBlockInteractions);
                break;

            case TutorialStep.PLANT_SEED:
                this.contentDiv.innerHTML = `
                    <h2>Step 3: Plant Your Avocado</h2>
                    <p>Excellent! Now click on the soil-filled pot and select your avocado plant to plant it.</p>
                    <p>Once planted, your avocado will begin growing through its lifecycle stages.</p>
                `;
                skipBtn.style.display = 'none';
                nextBtn.style.display = 'none';
                this.show(shouldBlockInteractions);
                break;

            case TutorialStep.COMPLETE:
                this.contentDiv.innerHTML = `
                    <h2>🎉 Tutorial Complete!</h2>
                    <p>You've successfully planted your first tree!</p>
                    <p>Now you can manage your garden, buy more plants and supplies from the shop, and watch your botanical business grow.</p>
                `;
                skipBtn.style.display = 'none';
                nextBtn.textContent = 'Start Gardening!';
                nextBtn.style.display = 'block';
                nextBtn.onclick = () => this.hide();
                this.show(shouldBlockInteractions);
                break;
        }
    }

    /**
     * Advance to next tutorial step
     */
    private next(): void {
        this.tutorialSystem.nextStep();
    }

    /**
     * Skip tutorial entirely
     */
    private skip(): void {
        this.tutorialSystem.skip();
        this.hide();
    }

    /**
     * Determine if a tutorial step should block 3D world interactions
     * Interactive steps (PLACE_POT, ADD_SOIL, PLANT_SEED) allow clicking
     * Non-interactive steps (WELCOME, COMPLETE) block clicking
     */
    private shouldBlockInteractions(step: TutorialStep): boolean {
        switch (step) {
            case TutorialStep.WELCOME:
            case TutorialStep.COMPLETE:
                return true; // Block interactions during these steps
            case TutorialStep.PLACE_POT:
            case TutorialStep.ADD_SOIL:
            case TutorialStep.PLANT_SEED:
                return false; // Allow interactions during these steps
            default:
                return true; // Safe default
        }
    }

    /**
     * Show the tutorial overlay
     * @param blockInteractions - Whether to block 3D world interactions
     */
    public show(blockInteractions: boolean = true): void {
        // Update visibility
        if (!this.visible) {
            this.container.style.display = 'block';
            this.visible = true;
        }

        // Always update overlay registration based on blocking state
        // (allows changing blocking state even when already visible)
        if (blockInteractions) {
            this.inputManager.registerOverlay('tutorial');
        } else {
            this.inputManager.unregisterOverlay('tutorial');
        }
    }

    /**
     * Hide the tutorial overlay
     */
    public hide(): void {
        if (this.visible) {
            this.container.style.display = 'none';
            this.visible = false;
            // Always unregister when hiding
            this.inputManager.unregisterOverlay('tutorial');
        }
    }

    /**
     * Check if tutorial is visible
     */
    public isVisible(): boolean {
        return this.visible;
    }
}

