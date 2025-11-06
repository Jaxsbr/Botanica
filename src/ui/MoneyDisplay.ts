/**
 * MoneyDisplay - UI component for displaying player's money balance
 * 
 * Shows current balance in top-right corner with visual feedback
 * for earning (green flash) and spending (red flash).
 */

export class MoneyDisplay {
    private container: HTMLDivElement;
    private currentMoney: number = 0;

    constructor() {
        this.container = this.createContainer();
        document.body.appendChild(this.container);
    }

    /**
     * Create the money display container
     */
    private createContainer(): HTMLDivElement {
        const container = document.createElement('div');
        container.className = 'money-display';
        container.textContent = '$0';
        return container;
    }

    /**
     * Update the displayed money value
     * Shows flash animation based on change direction
     */
    public update(newMoney: number): void {
        const previousMoney = this.currentMoney;
        this.currentMoney = newMoney;

        // Update text
        this.container.textContent = `$${newMoney}`;

        // Show flash animation if money changed
        if (newMoney !== previousMoney) {
            if (newMoney > previousMoney) {
                this.flashGreen();
            } else if (newMoney < previousMoney) {
                this.flashRed();
            }
        }
    }

    /**
     * Flash green (money earned)
     */
    private flashGreen(): void {
        this.container.classList.remove('flash-red');
        this.container.classList.add('flash-green');

        setTimeout(() => {
            this.container.classList.remove('flash-green');
        }, 300);
    }

    /**
     * Flash red (money spent)
     */
    private flashRed(): void {
        this.container.classList.remove('flash-green');
        this.container.classList.add('flash-red');

        setTimeout(() => {
            this.container.classList.remove('flash-red');
        }, 300);
    }

    /**
     * Clean up the money display
     */
    public dispose(): void {
        this.container.remove();
    }
}

