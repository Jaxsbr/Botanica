import type { Plant3DConfig } from '../../types';

interface DevPlantConfiguratorOptions {
    presets: Record<string, Plant3DConfig>;
}

type SliderKey =
    | 'trunkHeight'
    | 'branchDensity'
    | 'leafDensity'
    | 'leafSize'
    | 'growthDirection'
    | 'branchLevels';

type NumericDisplayFn = (value: number) => string;

interface SliderControl {
    input: HTMLInputElement;
    label: HTMLElement;
    format: NumericDisplayFn;
}

/**
 * DevPlantConfigurator - Developer UI overlay for tweaking Plant3D configs.
 *
 * Provides preset selection, full set of slider controls, and JSON export.
 */
export class DevPlantConfigurator {
    private readonly presets: Record<string, Plant3DConfig>;
    private readonly container: HTMLDivElement;
    private readonly panel: HTMLDivElement;
    private readonly statusLabel: HTMLDivElement;
    private readonly sliderControls = new Map<SliderKey, SliderControl>();
    private presetSelect!: HTMLSelectElement;
    private seedInput!: HTMLInputElement;
    private treeTypeSelect!: HTMLSelectElement;
    private sizeSelect!: HTMLSelectElement;
    private barkTypeSelect!: HTMLSelectElement;
    private leafTypeSelect!: HTMLSelectElement;
    private barkColorInput!: HTMLInputElement;
    private leafColorInput!: HTMLInputElement;
    private onConfigChange?: (config: Plant3DConfig) => void;
    private statusTimeout: number | null = null;
    private isVisible = false;
    private isUpdating = false;
    private currentConfig: Plant3DConfig;

    constructor(options: DevPlantConfiguratorOptions) {
        this.presets = options.presets;
        this.currentConfig = this.withDefaults(this.presets.sapling ?? {});

        this.container = this.createContainer();
        this.panel = this.createPanel();
        this.statusLabel = this.createStatusLabel();

        this.panel.appendChild(this.createHeader());
        this.panel.appendChild(this.createInstructions());
        this.panel.appendChild(this.createPresetSection());
        this.panel.appendChild(this.createStructureSection());
        this.panel.appendChild(this.createFoliageSection());
        this.panel.appendChild(this.createAppearanceSection());
        this.panel.appendChild(this.statusLabel);

        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);

        this.setConfig(this.currentConfig, true);
        this.hide();
    }

    public setOnConfigChange(handler: (config: Plant3DConfig) => void): void {
        this.onConfigChange = handler;
    }

    public show(): void {
        if (this.isVisible) {
            return;
        }
        this.isVisible = true;
        this.container.style.display = 'flex';
        requestAnimationFrame(() => {
            this.container.classList.add('visible');
        });
    }

    public hide(): void {
        if (!this.isVisible) {
            return;
        }
        this.isVisible = false;
        this.container.classList.remove('visible');
        window.setTimeout(() => {
            this.container.style.display = 'none';
        }, 200);
    }

    public setConfig(config: Plant3DConfig, suppressChange: boolean = false): void {
        this.isUpdating = true;
        this.currentConfig = this.withDefaults(config);

        this.seedInput.value = String(this.currentConfig.seed ?? '');
        this.treeTypeSelect.value = this.currentConfig.treeType ?? 'deciduous';
        this.sizeSelect.value = this.currentConfig.size ?? 'medium';
        this.barkTypeSelect.value = this.currentConfig.barkType ?? 'oak';
        this.leafTypeSelect.value = this.currentConfig.leafType ?? 'oak';
        this.barkColorInput.value = this.numberToHex(this.currentConfig.color?.bark);
        this.leafColorInput.value = this.numberToHex(this.currentConfig.color?.leaves);

        this.updateSlider('trunkHeight', this.currentConfig.trunkHeight ?? 5);
        this.updateSlider('branchDensity', this.currentConfig.branchDensity ?? 0.5);
        this.updateSlider('leafDensity', this.currentConfig.leafDensity ?? 0.5);
        this.updateSlider('leafSize', this.currentConfig.leafSize ?? 0.15);
        this.updateSlider('growthDirection', this.currentConfig.growthDirection ?? 0);
        this.updateSlider('branchLevels', this.currentConfig.branchLevels ?? 3);

        this.isUpdating = false;

        if (!suppressChange) {
            this.emitChange();
        }
    }

    private createContainer(): HTMLDivElement {
        const container = document.createElement('div');
        container.className = 'dev-configurator-overlay';
        container.style.display = 'none';
        container.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        return container;
    }

    private createPanel(): HTMLDivElement {
        const panel = document.createElement('div');
        panel.className = 'dev-configurator-panel';
        panel.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        return panel;
    }

    private createStatusLabel(): HTMLDivElement {
        const label = document.createElement('div');
        label.className = 'dev-configurator-status';
        label.textContent = '';
        return label;
    }

    private createHeader(): HTMLElement {
        const header = document.createElement('div');
        header.className = 'dev-configurator-header';

        const title = document.createElement('h2');
        title.textContent = 'Dev Plant Configurator';

        const actions = document.createElement('div');
        actions.className = 'dev-configurator-actions';

        const resetButton = this.createSecondaryButton('Reset Preset', () => {
            this.presetSelect.value = 'sapling';
            this.setConfig(this.presets.sapling ?? {}, false);
            this.showStatus('Restored sapling preset');
        });

        const exportButton = this.createPrimaryButton('Copy JSON', () => this.exportConfig());

        actions.appendChild(resetButton);
        actions.appendChild(exportButton);

        header.appendChild(title);
        header.appendChild(actions);

        return header;
    }

    private createInstructions(): HTMLElement {
        const note = document.createElement('p');
        note.className = 'dev-configurator-note';
        note.textContent = 'Adjust sliders to explore ez-tree parameters. Values update the preview immediately.';
        return note;
    }

    private createPresetSection(): HTMLElement {
        const section = this.createSection('Base Preset');

        this.presetSelect = document.createElement('select');
        this.presetSelect.className = 'dev-configurator-select';

        Object.keys(this.presets).forEach((name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
            this.presetSelect.appendChild(option);
        });

        this.presetSelect.value = 'sapling';
        this.presetSelect.addEventListener('change', () => {
            const selected = this.presets[this.presetSelect.value];
            if (selected) {
                this.setConfig(selected, false);
                this.showStatus(`Loaded preset: ${this.presetSelect.value}`);
            }
        });

        const randomSeedButton = this.createSecondaryButton('Random Seed', () => {
            this.seedInput.value = String(Math.floor(Math.random() * 100000));
            this.handleInputChange();
            this.showStatus('Seed randomized');
        });

        const controls = document.createElement('div');
        controls.className = 'dev-configurator-row';
        controls.appendChild(this.presetSelect);
        controls.appendChild(randomSeedButton);

        section.appendChild(controls);

        const seedField = this.createNumberInput('Seed', (value) => {
            this.handleInputChange();
            this.showStatus(`Seed set to ${value}`);
        });
        this.seedInput = seedField.input;
        section.appendChild(seedField.wrapper);

        return section;
    }

    private createStructureSection(): HTMLElement {
        const section = this.createSection('Structure');

        const treeTypeField = this.createSelectField('Tree Type', ['deciduous', 'evergreen'], () => {
            this.handleInputChange();
        });
        this.treeTypeSelect = treeTypeField.select;
        section.appendChild(treeTypeField.wrapper);

        const sizeField = this.createSelectField('Overall Size', ['small', 'medium', 'large'], () => {
            this.handleInputChange();
        });
        this.sizeSelect = sizeField.select;
        section.appendChild(sizeField.wrapper);

        section.appendChild(this.createSliderField(
            'trunkHeight',
            'Trunk Height',
            0.5,
            40,
            0.1,
            (value) => `${value.toFixed(1)}`
        ));

        section.appendChild(this.createSliderField(
            'branchLevels',
            'Branch Levels',
            1,
            5,
            1,
            (value) => `${value.toFixed(0)}`
        ));

        section.appendChild(this.createSliderField(
            'branchDensity',
            'Branch Density',
            0,
            1,
            0.01,
            (value) => value.toFixed(2)
        ));

        section.appendChild(this.createSliderField(
            'growthDirection',
            'Growth Direction',
            -1,
            1,
            0.01,
            (value) => value.toFixed(2)
        ));

        return section;
    }

    private createFoliageSection(): HTMLElement {
        const section = this.createSection('Foliage');

        section.appendChild(this.createSliderField(
            'leafDensity',
            'Leaf Density',
            0,
            1,
            0.01,
            (value) => value.toFixed(2)
        ));

        section.appendChild(this.createSliderField(
            'leafSize',
            'Leaf Size',
            0.02,
            0.6,
            0.01,
            (value) => value.toFixed(2)
        ));

        return section;
    }

    private createAppearanceSection(): HTMLElement {
        const section = this.createSection('Appearance');

        const barkField = this.createSelectField('Bark Type', ['birch', 'oak', 'pine', 'willow'], () => {
            this.handleInputChange();
        });
        this.barkTypeSelect = barkField.select;
        section.appendChild(barkField.wrapper);

        const leafField = this.createSelectField('Leaf Type', ['ash', 'aspen', 'pine', 'oak'], () => {
            this.handleInputChange();
        });
        this.leafTypeSelect = leafField.select;
        section.appendChild(leafField.wrapper);

        const barkColorField = this.createColorField('Bark Color', () => {
            this.handleInputChange();
        });
        this.barkColorInput = barkColorField.input;
        section.appendChild(barkColorField.wrapper);

        const leafColorField = this.createColorField('Leaf Color', () => {
            this.handleInputChange();
        });
        this.leafColorInput = leafColorField.input;
        section.appendChild(leafColorField.wrapper);

        return section;
    }

    private createSection(title: string): HTMLElement {
        const section = document.createElement('section');
        section.className = 'dev-configurator-section';

        const heading = document.createElement('h3');
        heading.textContent = title;
        section.appendChild(heading);

        return section;
    }

    private createSliderField(
        key: SliderKey,
        labelText: string,
        min: number,
        max: number,
        step: number,
        formatter: NumericDisplayFn
    ): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'dev-configurator-field';

        const label = document.createElement('label');
        label.textContent = labelText;

        const valueLabel = document.createElement('span');
        valueLabel.className = 'dev-configurator-value';
        label.appendChild(valueLabel);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);

        input.addEventListener('input', () => {
            valueLabel.textContent = formatter(Number(input.value));
            this.handleInputChange();
        });

        wrapper.appendChild(label);
        wrapper.appendChild(input);

        this.sliderControls.set(key, { input, label: valueLabel, format: formatter });

        return wrapper;
    }

    private createNumberInput(labelText: string, onChange: (value: number) => void): { wrapper: HTMLDivElement; input: HTMLInputElement } {
        const wrapper = document.createElement('div');
        wrapper.className = 'dev-configurator-field';

        const label = document.createElement('label');
        label.textContent = labelText;

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'dev-configurator-number';
        input.addEventListener('input', () => {
            const value = Number(input.value);
            if (!Number.isFinite(value)) {
                return;
            }
            onChange(value);
        });

        wrapper.appendChild(label);
        wrapper.appendChild(input);

        return { wrapper, input };
    }

    private createSelectField(labelText: string, options: string[], onChange: () => void): { wrapper: HTMLDivElement; select: HTMLSelectElement } {
        const wrapper = document.createElement('div');
        wrapper.className = 'dev-configurator-field';

        const label = document.createElement('label');
        label.textContent = labelText;

        const select = document.createElement('select');
        select.className = 'dev-configurator-select';
        options.forEach((option) => {
            const element = document.createElement('option');
            element.value = option;
            element.textContent = option.charAt(0).toUpperCase() + option.slice(1);
            select.appendChild(element);
        });
        select.addEventListener('change', onChange);

        wrapper.appendChild(label);
        wrapper.appendChild(select);

        return { wrapper, select };
    }

    private createColorField(labelText: string, onChange: () => void): { wrapper: HTMLDivElement; input: HTMLInputElement } {
        const wrapper = document.createElement('div');
        wrapper.className = 'dev-configurator-field';

        const label = document.createElement('label');
        label.textContent = labelText;

        const input = document.createElement('input');
        input.type = 'color';
        input.className = 'dev-configurator-color';
        input.addEventListener('input', onChange);

        wrapper.appendChild(label);
        wrapper.appendChild(input);

        return { wrapper, input };
    }

    private createPrimaryButton(text: string, onClick: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.className = 'dev-configurator-btn primary';
        button.textContent = text;
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            onClick();
        });
        return button;
    }

    private createSecondaryButton(text: string, onClick: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.className = 'dev-configurator-btn secondary';
        button.textContent = text;
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            onClick();
        });
        return button;
    }

    private updateSlider(key: SliderKey, value: number): void {
        const control = this.sliderControls.get(key);
        if (!control) {
            return;
        }
        control.input.value = String(value);
        control.label.textContent = control.format(value);
    }

    private handleInputChange(): void {
        if (this.isUpdating) {
            return;
        }
        this.currentConfig = this.collectConfig();
        this.emitChange();
    }

    private emitChange(): void {
        if (!this.onConfigChange) {
            return;
        }
        const config = this.collectConfig();
        this.onConfigChange(config);
    }

    private collectConfig(): Plant3DConfig {
        const branchLevelsRaw = Number(this.sliderControls.get('branchLevels')?.input.value ?? 3);
        const trunkHeightRaw = Number(this.sliderControls.get('trunkHeight')?.input.value ?? 5);
        const branchDensityRaw = Number(this.sliderControls.get('branchDensity')?.input.value ?? 0.5);
        const leafDensityRaw = Number(this.sliderControls.get('leafDensity')?.input.value ?? 0.5);
        const leafSizeRaw = Number(this.sliderControls.get('leafSize')?.input.value ?? 0.15);
        const growthDirectionRaw = Number(this.sliderControls.get('growthDirection')?.input.value ?? 0);

        const config: Plant3DConfig = {
            seed: Number(this.seedInput.value),
            treeType: this.treeTypeSelect.value as Plant3DConfig['treeType'],
            size: this.sizeSelect.value as Plant3DConfig['size'],
            trunkHeight: trunkHeightRaw,
            branchDensity: Math.min(1, Math.max(0, branchDensityRaw)),
            leafDensity: Math.min(1, Math.max(0, leafDensityRaw)),
            leafSize: Math.max(0.01, leafSizeRaw),
            growthDirection: Math.min(1, Math.max(-1, growthDirectionRaw)),
            branchLevels: Math.max(1, Math.min(5, Math.round(branchLevelsRaw))),
            barkType: this.barkTypeSelect.value as Plant3DConfig['barkType'],
            leafType: this.leafTypeSelect.value as Plant3DConfig['leafType'],
            color: {
                bark: this.hexToNumber(this.barkColorInput.value),
                leaves: this.hexToNumber(this.leafColorInput.value),
            },
        };

        return config;
    }

    private exportConfig(): void {
        const config = this.collectConfig();
        const json = JSON.stringify(config, null, 2);

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(json)
                .then(() => this.showStatus('Configuration copied to clipboard'))
                .catch((error) => {
                    console.error('Clipboard copy failed:', error);
                    this.showFallbackPrompt(json);
                });
        } else {
            this.showFallbackPrompt(json);
        }
    }

    private showFallbackPrompt(json: string): void {
        window.prompt('Copy configuration JSON', json);
        this.showStatus('Copy the JSON from the prompt window');
    }

    private showStatus(message: string): void {
        this.statusLabel.textContent = message;
        this.statusLabel.classList.add('visible');

        if (this.statusTimeout !== null) {
            window.clearTimeout(this.statusTimeout);
        }

        this.statusTimeout = window.setTimeout(() => {
            this.statusLabel.classList.remove('visible');
            this.statusTimeout = null;
        }, 2500);
    }

    private withDefaults(config: Plant3DConfig): Plant3DConfig {
        const base = this.presets.sapling ?? {};
        return {
            ...base,
            ...config,
            color: {
                bark: config.color?.bark ?? base.color?.bark ?? 0x8B5A2B,
                leaves: config.color?.leaves ?? base.color?.leaves ?? 0x2E8B57,
            },
        };
    }

    private numberToHex(value: number | undefined): string {
        const safeValue = value ?? 0x4A8F3A;
        return `#${safeValue.toString(16).padStart(6, '0')}`;
    }

    private hexToNumber(value: string): number {
        return parseInt(value.replace('#', ''), 16);
    }
}

