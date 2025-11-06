/**
 * PlantInspectionUI - Plant/Pot inspection modal
 * 
 * Displays soil stats (NPK, pH, drainage, water) when clicking a pot.
 * Allows watering if watering-can is owned.
 * Shows conditional information based on owned tools.
 */

import type { Pot } from '../containers/Pot';
import type { Inventory } from '../inventory/Inventory';
import type { SoilStats } from '../types';

export class PlantInspectionUI {
    private container: HTMLDivElement;
    private isVisible: boolean = false;
    private currentPot: Pot | null = null;
    private closeCallback?: () => void;

    constructor(private inventory: Inventory) {
        this.container = this.createContainer();
        document.body.appendChild(this.container);

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * Create the main container
     */
    private createContainer(): HTMLDivElement {
        const container = document.createElement('div');
        container.className = 'plant-inspection-modal';
        container.style.display = 'none';

        // Click outside to close
        container.addEventListener('click', (e) => {
            if (e.target === container) {
                this.hide();
            }
        });

        return container;
    }

    /**
     * Show inspection UI for a specific pot
     */
    public show(pot: Pot): void {
        this.currentPot = pot;
        this.isVisible = true;
        this.refresh();

        this.container.style.display = 'flex';
        setTimeout(() => {
            this.container.classList.add('visible');
        }, 10);
    }

    /**
     * Hide the inspection UI
     */
    public hide(): void {
        this.isVisible = false;
        this.currentPot = null;

        this.container.classList.remove('visible');
        setTimeout(() => {
            this.container.style.display = 'none';
        }, 300);

        // Trigger close callback
        if (this.closeCallback) {
            this.closeCallback();
        }
    }

    /**
     * Set callback for when UI is closed
     */
    public onClose(callback: () => void): void {
        this.closeCallback = callback;
    }

    /**
     * Refresh the UI with current pot data
     */
    public refresh(): void {
        if (!this.isVisible || !this.currentPot) return;

        this.container.innerHTML = '';

        const content = document.createElement('div');
        content.className = 'plant-inspection-content';

        content.appendChild(this.createHeader());
        content.appendChild(this.createStatsSection());
        content.appendChild(this.createActionsSection());

        this.container.appendChild(content);
    }

    /**
     * Create header section
     */
    private createHeader(): HTMLElement {
        const header = document.createElement('div');
        header.className = 'plant-inspection-header';

        const title = document.createElement('h2');
        title.textContent = '🪴 Plant Inspection';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'plant-inspection-close-btn';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', () => this.hide());

        header.appendChild(title);
        header.appendChild(closeBtn);

        return header;
    }

    /**
     * Create stats section with soil info
     * Three-tier display based on owned moisture meters
     */
    private createStatsSection(): HTMLElement {
        if (!this.currentPot) {
            return document.createElement('div');
        }

        const stats = this.currentPot.getSoil().getStats();
        const section = document.createElement('div');
        section.className = 'plant-inspection-stats';

        // Moisture display - three modes based on inventory
        const hasProMeter = this.inventory.hasItem('pro-moisture-meter');
        const hasBasicMeter = this.inventory.hasItem('basic-moisture-meter');

        if (hasProMeter) {
            // Pro meter: Full stats (bar + % + status)
            section.appendChild(this.createWaterBar(stats));
            section.appendChild(this.createMoistureIndicator(stats));
        } else if (hasBasicMeter) {
            // Basic meter: Status text only
            section.appendChild(this.createMoistureIndicator(stats));
        } else {
            // No meter: Last watered time only
            section.appendChild(this.createLastWateredDisplay());
        }

        // Drainage info
        section.appendChild(this.createDrainageInfo(stats));

        // NPK nutrients (gray bars - static for now)
        section.appendChild(this.createNPKBars(stats));

        // pH level
        section.appendChild(this.createPHDisplay(stats));

        return section;
    }

    /**
     * Create water level progress bar
     */
    private createWaterBar(stats: SoilStats): HTMLElement {
        const container = document.createElement('div');
        container.className = 'stat-row';

        const label = document.createElement('div');
        label.className = 'stat-label';
        label.textContent = '💧 Water';

        const barContainer = document.createElement('div');
        barContainer.className = 'stat-bar-container';

        const bar = document.createElement('div');
        bar.className = 'stat-bar water-bar';

        const waterPercent = (stats.waterLevel / stats.maxWater) * 100;
        bar.style.width = `${waterPercent}%`;

        // Color-code based on water level
        if (waterPercent < 30) {
            bar.classList.add('low');
        } else if (waterPercent < 60) {
            bar.classList.add('medium');
        } else {
            bar.classList.add('high');
        }

        const value = document.createElement('div');
        value.className = 'stat-value';
        value.textContent = `${stats.waterLevel.toFixed(0)}%`;

        barContainer.appendChild(bar);
        container.appendChild(label);
        container.appendChild(barContainer);
        container.appendChild(value);

        return container;
    }

    /**
     * Create last watered display (shown when no moisture meter)
     */
    private createLastWateredDisplay(): HTMLElement {
        if (!this.currentPot) {
            return document.createElement('div');
        }

        const container = document.createElement('div');
        container.className = 'last-watered-display';

        const soil = this.currentPot.getSoil();
        const timeAgo = soil.getTimeSinceWatered();

        container.textContent = `💧 Last watered: ${timeAgo}`;

        return container;
    }

    /**
     * Create moisture indicator (detailed text based on ACTUAL water level)
     * Shows true moisture status - only visible with moisture meter
     */
    private createMoistureIndicator(stats: SoilStats): HTMLElement {
        const container = document.createElement('div');
        container.className = 'moisture-indicator';

        let status = '';
        let color = '';

        if (stats.waterLevel < 20) {
            status = 'Dry - Water soon!';
            color = '#d32f2f';
        } else if (stats.waterLevel < 40) {
            status = 'Low moisture - Consider watering';
            color = '#f57c00';
        } else if (stats.waterLevel < 70) {
            status = 'Adequate moisture';
            color = '#fbc02d';
        } else {
            status = 'Well hydrated';
            color = '#388e3c';
        }

        container.textContent = `📊 ${status}`;
        container.style.color = color;

        return container;
    }

    /**
     * Create drainage type display
     */
    private createDrainageInfo(stats: SoilStats): HTMLElement {
        const container = document.createElement('div');
        container.className = 'stat-info';

        const label = document.createElement('span');
        label.textContent = '🚰 Drainage: ';

        const value = document.createElement('span');
        value.className = 'stat-value-text';
        value.textContent = stats.drainage.charAt(0).toUpperCase() + stats.drainage.slice(1);

        container.appendChild(label);
        container.appendChild(value);

        return container;
    }

    /**
     * Create NPK nutrient bars (static for Phase 1.3)
     */
    private createNPKBars(stats: SoilStats): HTMLElement {
        const container = document.createElement('div');
        container.className = 'npk-section';

        const title = document.createElement('div');
        title.className = 'npk-title';
        title.textContent = '🌱 Nutrients (NPK)';

        container.appendChild(title);

        const nutrients = [
            { label: 'N (Nitrogen)', value: stats.nitrogen, color: '#1976d2' },
            { label: 'P (Phosphorus)', value: stats.phosphorus, color: '#d32f2f' },
            { label: 'K (Potassium)', value: stats.potassium, color: '#388e3c' }
        ];

        nutrients.forEach(nutrient => {
            const row = document.createElement('div');
            row.className = 'stat-row';

            const label = document.createElement('div');
            label.className = 'stat-label-small';
            label.textContent = nutrient.label;

            const barContainer = document.createElement('div');
            barContainer.className = 'stat-bar-container';

            const bar = document.createElement('div');
            bar.className = 'stat-bar npk-bar';
            bar.style.width = `${nutrient.value}%`;
            bar.style.backgroundColor = '#aaa'; // Gray for static phase

            const value = document.createElement('div');
            value.className = 'stat-value';
            value.textContent = `${nutrient.value}`;

            barContainer.appendChild(bar);
            row.appendChild(label);
            row.appendChild(barContainer);
            row.appendChild(value);

            container.appendChild(row);
        });

        return container;
    }

    /**
     * Create pH level display
     */
    private createPHDisplay(stats: SoilStats): HTMLElement {
        const container = document.createElement('div');
        container.className = 'stat-info';

        const label = document.createElement('span');
        label.textContent = '🧪 pH Level: ';

        const value = document.createElement('span');
        value.className = 'stat-value-text ph-value';
        value.textContent = stats.pH.toFixed(1);

        // Color-code pH
        if (stats.pH < 6.0) {
            value.style.color = '#d32f2f'; // Acidic - red
        } else if (stats.pH > 7.5) {
            value.style.color = '#1976d2'; // Alkaline - blue
        } else {
            value.style.color = '#388e3c'; // Neutral - green
        }

        container.appendChild(label);
        container.appendChild(value);

        return container;
    }

    /**
     * Create actions section with water button
     */
    private createActionsSection(): HTMLElement {
        const section = document.createElement('div');
        section.className = 'plant-inspection-actions';

        const waterBtn = document.createElement('button');
        waterBtn.className = 'action-btn water-btn';
        waterBtn.textContent = '💧 Water Plant';

        // Only enable if watering-can owned
        const hasWateringCan = this.inventory.hasItem('watering-can');
        waterBtn.disabled = !hasWateringCan;

        if (!hasWateringCan) {
            waterBtn.title = 'Purchase a watering can from the shop first';
        }

        waterBtn.addEventListener('click', () => this.onWaterClick(waterBtn));

        section.appendChild(waterBtn);

        return section;
    }

    /**
     * Handle water button click
     */
    private onWaterClick(button: HTMLButtonElement): void {
        if (!this.currentPot) return;

        // Water the soil
        this.currentPot.getSoil().water(50);

        // Visual feedback - pulse animation
        button.classList.add('watering');
        setTimeout(() => {
            button.classList.remove('watering');
        }, 500);

        // Refresh UI to show updated water level
        this.refresh();
    }

    /**
     * Clean up
     */
    public dispose(): void {
        this.container.remove();
    }
}

