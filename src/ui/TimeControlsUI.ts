/**
 * TimeControlsUI - Time speed control interface
 * 
 * Displays time control buttons in bottom-left corner:
 * ⏸️ Pause (0x)
 * ▶️ Normal (1x)
 * ⏩ Fast (5x)
 * ⏭️ Turbo (10x)
 */

import { TimeManager, TimeSpeed } from '../systems/TimeManager';

export class TimeControlsUI {
    private container: HTMLDivElement;
    private timeManager: TimeManager;
    private buttons: Map<TimeSpeed, HTMLButtonElement> = new Map();

    constructor() {
        this.timeManager = TimeManager.getInstance();
        this.container = this.createControls();

        // Subscribe to time speed changes to update button states
        this.timeManager.subscribe((speed) => this.updateButtonStates(speed));
    }

    /**
     * Create time control UI
     */
    private createControls(): HTMLDivElement {
        const container = document.createElement('div');
        container.className = 'time-controls';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.85);
            padding: 12px;
            border-radius: 10px;
            border: 2px solid #4CAF50;
            display: flex;
            gap: 8px;
            z-index: 900;
            font-family: Arial, sans-serif;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        `;

        // Add CSS for buttons
        const style = document.createElement('style');
        style.textContent = `
            .time-control-btn {
                width: 50px;
                height: 50px;
                background: #2d5016;
                color: white;
                border: 2px solid #4CAF50;
                border-radius: 8px;
                cursor: pointer;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                flex-direction: column;
            }
            
            .time-control-btn:hover {
                background: #3d6621;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            }
            
            .time-control-btn.active {
                background: #4CAF50;
                border-color: #6cf;
                box-shadow: 0 0 12px rgba(76, 175, 80, 0.5);
            }
            
            .time-control-label {
                font-size: 10px;
                margin-top: 2px;
                color: #aaa;
            }
            
            .time-control-btn.active .time-control-label {
                color: white;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);

        // Create buttons for each time speed
        const speeds = [
            { speed: TimeSpeed.PAUSED, icon: '⏸️', label: 'Pause' },
            { speed: TimeSpeed.NORMAL, icon: '▶️', label: '1x' },
            { speed: TimeSpeed.FAST, icon: '⏩', label: '5x' },
            { speed: TimeSpeed.TURBO, icon: '⏭️', label: '10x' }
        ];

        speeds.forEach(({ speed, icon, label }) => {
            const btn = document.createElement('button');
            btn.className = 'time-control-btn';
            btn.innerHTML = `
                <div>${icon}</div>
                <div class="time-control-label">${label}</div>
            `;
            btn.title = `Set time speed to ${label}`;
            btn.onclick = () => this.timeManager.setSpeed(speed);

            container.appendChild(btn);
            this.buttons.set(speed, btn);
        });

        document.body.appendChild(container);

        // Set initial active state
        this.updateButtonStates(this.timeManager.getSpeed());

        return container;
    }

    /**
     * Update button active states
     */
    private updateButtonStates(currentSpeed: TimeSpeed): void {
        this.buttons.forEach((btn, speed) => {
            if (speed === currentSpeed) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Show the controls
     */
    public show(): void {
        this.container.style.display = 'flex';
    }

    /**
     * Hide the controls
     */
    public hide(): void {
        this.container.style.display = 'none';
    }

    /**
     * Dispose of the UI
     */
    public dispose(): void {
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}


