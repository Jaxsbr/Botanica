import * as THREE from 'three';
import type { AbstractPlantConfig, BranchChildrenConfig, RootsConfig, CrystalConfig } from '../../plants/abstract/AbstractPlant';
import type { LeafDistribution, LeafShape, FruitShape, CrystalPlacement } from '../../plants/abstract/PlantParts';

type FlowerPosition = NonNullable<AbstractPlantConfig['flowers']>['position'];

interface DevPlantConfiguratorOptions {
    presets: Record<string, AbstractPlantConfig>;
}

export interface DevPlantConfiguratorChange {
    config: AbstractPlantConfig;
    growthPercent: number;
    autoAnimate: boolean;
    autoSpeed: number;
}

type SliderFormatter = (value: number) => string;

interface SliderField {
    wrapper: HTMLDivElement;
    input: HTMLInputElement;
    valueLabel: HTMLSpanElement;
    formatter: SliderFormatter;
}

interface NumberField {
    wrapper: HTMLDivElement;
    input: HTMLInputElement;
}

interface ToggleField {
    wrapper: HTMLDivElement;
    checkbox: HTMLInputElement;
}

function cloneColor(color: THREE.Color): THREE.Color {
    return new THREE.Color().copy(color);
}

function cloneConfig(config: AbstractPlantConfig): AbstractPlantConfig {
    return {
        ...config,
        leafColor: cloneColor(config.leafColor),
        trunkColor: cloneColor(config.trunkColor),
        trunkMetallic: config.trunkMetallic ?? 0.15,
        trunkRoughness: config.trunkRoughness ?? 0.65,
        branchChildren: config.branchChildren
            ? { ...config.branchChildren }
            : undefined,
        roots: config.roots
            ? { ...config.roots }
            : undefined,
        flowers: config.flowers
            ? {
                ...config.flowers,
                color: cloneColor(config.flowers.color),
            }
            : undefined,
        fruit: config.fruit
            ? {
                ...config.fruit,
                color: cloneColor(config.fruit.color),
            }
            : undefined,
        glow: config.glow
            ? {
                ...config.glow,
                color: cloneColor(config.glow.color),
            }
            : undefined,
        crystals: config.crystals
            ? {
                ...config.crystals,
                color: cloneColor(config.crystals.color),
                placement: config.crystals.placement ? [...config.crystals.placement] : undefined,
            }
            : undefined,
    };
}

function colorToHex(color: THREE.Color): string {
    return `#${color.getHexString()}`;
}

function hexToColor(hex: string): THREE.Color {
    return new THREE.Color(hex);
}

/**
 * DevPlantConfigurator - Developer UI overlay for tweaking AbstractPlant configs.
 */
export class DevPlantConfigurator {
    private readonly presets: Record<string, AbstractPlantConfig>;
    private readonly container: HTMLDivElement;
    private readonly panel: HTMLDivElement;
    private readonly statusLabel: HTMLDivElement;
    private readonly sliderFields = new Map<string, SliderField>();
    private readonly numberFields = new Map<string, NumberField>();
    private readonly colorInputs = new Map<string, HTMLInputElement>();
    private readonly selectInputs = new Map<string, HTMLSelectElement>();
    private readonly toggleFields = new Map<string, ToggleField>();
    private presetSelect!: HTMLSelectElement;
    private growthSlider!: HTMLInputElement;
    private growthValueLabel!: HTMLSpanElement;
    private autoAnimateCheckbox!: HTMLInputElement;
    private autoSpeedSlider!: HTMLInputElement;
    private autoSpeedValueLabel!: HTMLSpanElement;
    private flowerControls!: HTMLDivElement;
    private fruitControls!: HTMLDivElement;
    private glowControls!: HTMLDivElement;
    private crystalControls!: HTMLDivElement;
    private branchChildrenControls!: HTMLDivElement;
    private rootsControls!: HTMLDivElement;
    private readonly crystalPlacementCheckboxes = new Map<CrystalPlacement, HTMLInputElement>();
    private onConfigChange?: (change: DevPlantConfiguratorChange) => void;
    private statusTimeout: number | null = null;
    private isVisible = false;
    private isUpdating = false;
    private currentConfig: AbstractPlantConfig;
    private currentGrowthPercent = 50;
    private autoAnimate = false;
    private autoSpeed = 15;
    private activePresetKey: string | null = null;

    constructor(options: DevPlantConfiguratorOptions) {
        this.presets = options.presets;
        const defaultKey = this.presets.avocadoSapling ? 'avocadoSapling' : Object.keys(this.presets)[0];
        const defaultPreset = defaultKey ? this.presets[defaultKey] : undefined;
        if (!defaultPreset) {
            throw new Error('No abstract plant presets provided for DevPlantConfigurator');
        }

        this.currentConfig = cloneConfig(defaultPreset);
        this.activePresetKey = defaultKey ?? null;

        this.container = this.createContainer();
        this.panel = this.createPanel();
        this.statusLabel = this.createStatusLabel();

        this.panel.appendChild(this.createHeader());
        this.panel.appendChild(this.createInstructions());
        this.panel.appendChild(this.createPresetSection());
        this.panel.appendChild(this.createGrowthSection());
        this.panel.appendChild(this.createStructureSection());
        this.panel.appendChild(this.createBranchingSection());
        this.panel.appendChild(this.createBranchChildrenSection());
        this.panel.appendChild(this.createRootsSection());
        this.panel.appendChild(this.createLeafSection());
        this.panel.appendChild(this.createAppearanceSection());
        this.panel.appendChild(this.createFeaturesSection());
        this.panel.appendChild(this.statusLabel);

        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);

        this.setConfig(this.currentConfig, this.currentGrowthPercent, true, this.activePresetKey ?? undefined);
        this.hide();
    }

    public setOnConfigChange(handler: (change: DevPlantConfiguratorChange) => void): void {
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

    public setConfig(
        config: AbstractPlantConfig,
        growthPercent: number,
        suppressChange: boolean = false,
        presetKey?: string
    ): void {
        this.isUpdating = true;
        this.currentConfig = cloneConfig(config);
        this.currentGrowthPercent = THREE.MathUtils.clamp(growthPercent, 0, 100);
        this.activePresetKey = presetKey && this.presets[presetKey] ? presetKey : null;

        this.updatePresetSelect();
        this.updateGrowthControls();
        this.updateStructureControls();
        this.updateBranchingControls();
        this.updateBranchChildrenControls(this.currentConfig.branchChildren);
        this.updateRootsControls(this.currentConfig.roots);
        this.updateLeafControls();
        this.updateAppearanceControls();
        this.updateFeatureControls();

        this.isUpdating = false;

        if (!suppressChange) {
            this.emitChange();
        }
    }

    public setGrowthPercent(growthPercent: number, suppressChange: boolean = false): void {
        this.currentGrowthPercent = THREE.MathUtils.clamp(growthPercent, 0, 100);
        this.updateSliderDisplay(this.growthSlider, this.growthValueLabel, this.currentGrowthPercent, (value) => `${value.toFixed(0)}%`);
        if (!suppressChange) {
            this.emitChange();
        }
    }

    public setAutoAnimation(enabled: boolean, speed: number): void {
        this.autoAnimate = enabled;
        this.autoSpeed = speed;
        this.autoAnimateCheckbox.checked = enabled;
        this.autoSpeedSlider.value = String(speed);
        this.autoSpeedValueLabel.textContent = `${speed.toFixed(0)}%/s`;
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
        title.textContent = 'Abstract Plant Lab';

        const actions = document.createElement('div');
        actions.className = 'dev-configurator-actions';

        const resetButton = this.createSecondaryButton('Reset Preset', () => {
            const preset = this.presets[this.presetSelect.value];
            if (preset) {
                this.setConfig(preset, this.currentGrowthPercent, false, this.presetSelect.value);
                this.showStatus(`Restored preset: ${this.presetSelect.value}`);
            }
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
        note.textContent = 'Tune parameters for the AbstractPlant prototype. Adjust structure, foliage, and fantasy effects; growth updates in real time.';
        return note;
    }

    private createPresetSection(): HTMLElement {
        const section = this.createSection('Preset');

        this.presetSelect = document.createElement('select');
        this.presetSelect.className = 'dev-configurator-select';

        Object.keys(this.presets).forEach((name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            this.presetSelect.appendChild(option);
        });

        const customOption = document.createElement('option');
        customOption.value = '__custom__';
        customOption.textContent = 'Custom';
        this.presetSelect.appendChild(customOption);

        this.presetSelect.addEventListener('change', () => {
            if (this.isUpdating) {
                return;
            }
            if (this.presetSelect.value === '__custom__') {
                this.activePresetKey = null;
                return;
            }
            const preset = this.presets[this.presetSelect.value];
            if (preset) {
                this.setConfig(preset, this.currentGrowthPercent, false, this.presetSelect.value);
                this.showStatus(`Loaded preset: ${this.presetSelect.value}`);
            }
        });

        section.appendChild(this.presetSelect);

        return section;
    }

    private createGrowthSection(): HTMLElement {
        const section = this.createSection('Growth');

        const growthField = this.createSliderField(
            'growth',
            'Growth Percent',
            0,
            100,
            1,
            (value) => `${value.toFixed(0)}%`
        );
        this.growthSlider = growthField.input;
        this.growthValueLabel = growthField.valueLabel;
        this.growthSlider.addEventListener('input', () => {
            if (this.isUpdating) {
                return;
            }
            this.currentGrowthPercent = Number(this.growthSlider.value);
            this.handleInputChange();
        });
        section.appendChild(growthField.wrapper);

        const autoRow = document.createElement('div');
        autoRow.className = 'dev-configurator-field';

        const autoLabel = document.createElement('label');
        autoLabel.textContent = 'Animate Growth';

        this.autoAnimateCheckbox = document.createElement('input');
        this.autoAnimateCheckbox.type = 'checkbox';
        this.autoAnimateCheckbox.addEventListener('change', () => {
            this.autoAnimate = this.autoAnimateCheckbox.checked;
            this.handleInputChange();
        });

        autoLabel.appendChild(this.autoAnimateCheckbox);
        autoRow.appendChild(autoLabel);

        section.appendChild(autoRow);

        const speedField = this.createSliderField(
            'autoSpeed',
            'Auto Speed',
            1,
            40,
            1,
            (value) => `${value.toFixed(0)}%/s`
        );
        this.autoSpeedSlider = speedField.input;
        this.autoSpeedValueLabel = speedField.valueLabel;
        this.autoSpeedSlider.addEventListener('input', () => {
            this.autoSpeed = Number(this.autoSpeedSlider.value);
            this.handleInputChange();
        });
        section.appendChild(speedField.wrapper);

        return section;
    }

    private createStructureSection(): HTMLElement {
        const section = this.createSection('Structure');

        section.appendChild(this.createSliderField(
            'maxHeight',
            'Max Height',
            0.5,
            12,
            0.1,
            (value) => `${value.toFixed(1)}`
        ).wrapper);

        section.appendChild(this.createSliderField(
            'trunkThickness',
            'Trunk Thickness',
            0.05,
            1,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        section.appendChild(this.createSliderField(
            'trunkTaper',
            'Trunk Taper',
            0,
            0.95,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        return section;
    }

    private createBranchingSection(): HTMLElement {
        const section = this.createSection('Branching');

        const apexToggle = this.createToggleField('Branches Reach Apex', () => {
            this.handleInputChange();
        });
        this.toggleFields.set('branchAtApex', apexToggle);
        section.appendChild(apexToggle.wrapper);

        section.appendChild(this.createSliderField(
            'branchLevels',
            'Branch Levels',
            0,
            6,
            1,
            (value) => value.toFixed(0)
        ).wrapper);

        section.appendChild(this.createSliderField(
            'branchesPerLevel',
            'Branches Per Level',
            1,
            8,
            1,
            (value) => value.toFixed(0)
        ).wrapper);

        section.appendChild(this.createSliderField(
            'branchAngle',
            'Branch Angle',
            0,
            85,
            1,
            (value) => `${value.toFixed(0)}°`
        ).wrapper);

        section.appendChild(this.createSliderField(
            'branchLength',
            'Branch Length',
            0.1,
            1.6,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        section.appendChild(this.createSliderField(
            'branchCurve',
            'Branch Curve',
            -1,
            1,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        section.appendChild(this.createSliderField(
            'branchThickness',
            'Branch Thickness',
            0.02,
            1.5,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        section.appendChild(this.createSliderField(
            'branchThicknessFalloff',
            'Branch Thickness Falloff',
            0.1,
            1.5,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        return section;
    }

    private createBranchChildrenSection(): HTMLElement {
        const section = this.createSection('Branch Subdivisions');

        const toggle = this.createToggleField('Enable Child Branches', (checked) => {
            if (this.branchChildrenControls) {
                this.branchChildrenControls.style.display = checked ? 'block' : 'none';
            }
            this.handleInputChange();
        });
        this.toggleFields.set('branchChildrenEnabled', toggle);
        section.appendChild(toggle.wrapper);

        this.branchChildrenControls = document.createElement('div');
        this.branchChildrenControls.className = 'dev-configurator-subsection';

        this.branchChildrenControls.appendChild(this.createSliderField(
            'branchChildLevels',
            'Child Levels',
            0,
            3,
            1,
            (value) => value.toFixed(0)
        ).wrapper);

        this.branchChildrenControls.appendChild(this.createSliderField(
            'branchChildBranches',
            'Child Branches / Level',
            1,
            4,
            1,
            (value) => value.toFixed(0)
        ).wrapper);

        this.branchChildrenControls.appendChild(this.createSliderField(
            'branchChildLengthScale',
            'Child Length Scale',
            0.2,
            0.9,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        this.branchChildrenControls.appendChild(this.createSliderField(
            'branchChildThicknessScale',
            'Child Thickness Scale',
            0.2,
            0.9,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        this.branchChildrenControls.appendChild(this.createSliderField(
            'branchChildAngle',
            'Child Tilt Angle',
            0,
            60,
            1,
            (value) => `${value.toFixed(0)}°`
        ).wrapper);

        this.branchChildrenControls.appendChild(this.createSliderField(
            'branchChildSpread',
            'Child Spread',
            10,
            140,
            1,
            (value) => `${value.toFixed(0)}°`
        ).wrapper);

        this.branchChildrenControls.appendChild(this.createSliderField(
            'branchChildCurve',
            'Child Curve',
            -0.5,
            0.5,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        this.branchChildrenControls.appendChild(this.createSliderField(
            'branchChildLeafScale',
            'Child Leaf Scale',
            0.2,
            1,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        section.appendChild(this.branchChildrenControls);

        return section;
    }

    private createRootsSection(): HTMLElement {
        const section = this.createSection('Roots');

        const toggle = this.createToggleField('Enable Roots', (checked) => {
            if (this.rootsControls) {
                this.rootsControls.style.display = checked ? 'block' : 'none';
            }
            this.handleInputChange();
        });
        this.toggleFields.set('rootsEnabled', toggle);
        section.appendChild(toggle.wrapper);

        this.rootsControls = document.createElement('div');
        this.rootsControls.className = 'dev-configurator-subsection';

        const rootCountField = this.createNumberField('Root Count', 1, 16, 1);
        this.numberFields.set('rootCount', rootCountField);
        this.rootsControls.appendChild(rootCountField.wrapper);

        this.rootsControls.appendChild(this.createSliderField(
            'rootLength',
            'Root Length',
            0.1,
            1,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        this.rootsControls.appendChild(this.createSliderField(
            'rootThickness',
            'Root Thickness',
            0.1,
            1,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        this.rootsControls.appendChild(this.createSliderField(
            'rootTaper',
            'Root Taper',
            0,
            1,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        this.rootsControls.appendChild(this.createSliderField(
            'rootSpread',
            'Root Spread',
            0,
            1,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        this.rootsControls.appendChild(this.createSliderField(
            'rootFlareHeight',
            'Flare Height',
            0,
            0.4,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        section.appendChild(this.rootsControls);

        return section;
    }

    private createLeafSection(): HTMLElement {
        const section = this.createSection('Foliage');

        const leafShapeSelect = this.createSelectField('Leaf Shape', ['sphere', 'ellipsoid', 'cone', 'spiky'], () => this.handleInputChange());
        this.selectInputs.set('leafShape', leafShapeSelect.select);
        section.appendChild(leafShapeSelect.wrapper);

        const leafDistributionSelect = this.createSelectField('Leaf Pattern', ['spiral', 'opposite', 'whorled', 'clustered'], () => this.handleInputChange());
        this.selectInputs.set('leafDistribution', leafDistributionSelect.select);
        section.appendChild(leafDistributionSelect.wrapper);

        section.appendChild(this.createSliderField(
            'leafSize',
            'Leaf Size',
            0.1,
            1.5,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        const leafCountField = this.createNumberField('Leaf Count', 0, 400, 1);
        this.numberFields.set('leafCount', leafCountField);
        section.appendChild(leafCountField.wrapper);

        const leafColorField = this.createColorField('Leaf Color', () => this.handleInputChange());
        this.colorInputs.set('leafColor', leafColorField.input);
        section.appendChild(leafColorField.wrapper);

        return section;
    }

    private createAppearanceSection(): HTMLElement {
        const section = this.createSection('Trunk Appearance');

        const trunkColorField = this.createColorField('Trunk Color', () => this.handleInputChange());
        this.colorInputs.set('trunkColor', trunkColorField.input);
        section.appendChild(trunkColorField.wrapper);

        section.appendChild(this.createSliderField(
            'trunkMetallic',
            'Trunk Metallic',
            0,
            1,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        section.appendChild(this.createSliderField(
            'trunkRoughness',
            'Trunk Roughness',
            0,
            1,
            0.01,
            (value) => value.toFixed(2)
        ).wrapper);

        return section;
    }

    private createFeaturesSection(): HTMLElement {
        const section = this.createSection('Fantasy Features');

        const flowerToggle = this.createToggleField('Flowers', (checked) => {
            this.flowerControls.style.display = checked ? 'block' : 'none';
            this.handleInputChange();
        });
        this.toggleFields.set('flowers', flowerToggle);
        section.appendChild(flowerToggle.wrapper);

        this.flowerControls = document.createElement('div');
        this.flowerControls.className = 'dev-configurator-subsection';

        const petalField = this.createNumberField('Petal Count', 0, 24, 1);
        this.numberFields.set('flowerPetalCount', petalField);
        this.flowerControls.appendChild(petalField.wrapper);

        const flowerSizeSlider = this.createSliderField(
            'flowerSize',
            'Flower Size',
            0.1,
            1.2,
            0.01,
            (value) => value.toFixed(2)
        );
        this.flowerControls.appendChild(flowerSizeSlider.wrapper);

        const flowerColorField = this.createColorField('Flower Color', () => this.handleInputChange());
        this.colorInputs.set('flowerColor', flowerColorField.input);
        this.flowerControls.appendChild(flowerColorField.wrapper);

        const flowerPositionSelect = this.createSelectField('Flower Position', ['top', 'branches', 'trunk'], () => this.handleInputChange());
        this.selectInputs.set('flowerPosition', flowerPositionSelect.select);
        this.flowerControls.appendChild(flowerPositionSelect.wrapper);

        section.appendChild(this.flowerControls);

        const fruitToggle = this.createToggleField('Fruit', (checked) => {
            this.fruitControls.style.display = checked ? 'block' : 'none';
            this.handleInputChange();
        });
        this.toggleFields.set('fruit', fruitToggle);
        section.appendChild(fruitToggle.wrapper);

        this.fruitControls = document.createElement('div');
        this.fruitControls.className = 'dev-configurator-subsection';

        const fruitShapeSelect = this.createSelectField('Fruit Shape', ['sphere', 'ellipsoid', 'cluster'], () => this.handleInputChange());
        this.selectInputs.set('fruitShape', fruitShapeSelect.select);
        this.fruitControls.appendChild(fruitShapeSelect.wrapper);

        const fruitSizeSlider = this.createSliderField(
            'fruitSize',
            'Fruit Size',
            0.1,
            1,
            0.01,
            (value) => value.toFixed(2)
        );
        this.fruitControls.appendChild(fruitSizeSlider.wrapper);

        const fruitCountField = this.createNumberField('Fruit Count', 0, 24, 1);
        this.numberFields.set('fruitCount', fruitCountField);
        this.fruitControls.appendChild(fruitCountField.wrapper);

        const fruitColorField = this.createColorField('Fruit Color', () => this.handleInputChange());
        this.colorInputs.set('fruitColor', fruitColorField.input);
        this.fruitControls.appendChild(fruitColorField.wrapper);

        section.appendChild(this.fruitControls);

        const glowToggle = this.createToggleField('Glow', (checked) => {
            this.glowControls.style.display = checked ? 'block' : 'none';
            this.handleInputChange();
        });
        this.toggleFields.set('glow', glowToggle);
        section.appendChild(glowToggle.wrapper);

        this.glowControls = document.createElement('div');
        this.glowControls.className = 'dev-configurator-subsection';

        const glowColorField = this.createColorField('Glow Color', () => this.handleInputChange());
        this.colorInputs.set('glowColor', glowColorField.input);
        this.glowControls.appendChild(glowColorField.wrapper);

        const glowIntensitySlider = this.createSliderField(
            'glowIntensity',
            'Glow Intensity',
            0,
            2.5,
            0.05,
            (value) => value.toFixed(2)
        );
        this.glowControls.appendChild(glowIntensitySlider.wrapper);

        section.appendChild(this.glowControls);

        const crystalToggle = this.createToggleField('Crystals', (checked) => {
            this.crystalControls.style.display = checked ? 'block' : 'none';
            this.handleInputChange();
        });
        this.toggleFields.set('crystals', crystalToggle);
        section.appendChild(crystalToggle.wrapper);

        this.crystalControls = document.createElement('div');
        this.crystalControls.className = 'dev-configurator-subsection';

        const crystalSizeSlider = this.createSliderField(
            'crystalSize',
            'Crystal Size',
            0.1,
            1.2,
            0.01,
            (value) => value.toFixed(2)
        );
        this.crystalControls.appendChild(crystalSizeSlider.wrapper);

        const crystalCountField = this.createNumberField('Crystal Count', 0, 12, 1);
        this.numberFields.set('crystalCount', crystalCountField);
        this.crystalControls.appendChild(crystalCountField.wrapper);

        const crystalColorField = this.createColorField('Crystal Color', () => this.handleInputChange());
        this.colorInputs.set('crystalColor', crystalColorField.input);
        this.crystalControls.appendChild(crystalColorField.wrapper);

        const placementField = document.createElement('div');
        placementField.className = 'dev-configurator-field';
        const placementLabel = document.createElement('label');
        placementLabel.textContent = 'Placement';
        placementField.appendChild(placementLabel);

        const placementRow = document.createElement('div');
        placementRow.className = 'dev-configurator-checkbox-row';
        (['trunk', 'branches', 'roots'] as CrystalPlacement[]).forEach((placement) => {
            const item = document.createElement('label');
            item.className = 'dev-configurator-checkbox';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.addEventListener('change', () => this.handleInputChange());

            const span = document.createElement('span');
            span.textContent = placement.charAt(0).toUpperCase() + placement.slice(1);

            item.appendChild(checkbox);
            item.appendChild(span);
            placementRow.appendChild(item);

            this.crystalPlacementCheckboxes.set(placement, checkbox);
        });

        placementField.appendChild(placementRow);
        this.crystalControls.appendChild(placementField);

        section.appendChild(this.crystalControls);

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
        key: string,
        labelText: string,
        min: number,
        max: number,
        step: number,
        formatter: SliderFormatter
    ): SliderField {
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

        const field: SliderField = { wrapper, input, valueLabel, formatter };
        this.sliderFields.set(key, field);

        return field;
    }

    private createNumberField(labelText: string, min: number, max: number, step: number): NumberField {
        const wrapper = document.createElement('div');
        wrapper.className = 'dev-configurator-field';

        const label = document.createElement('label');
        label.textContent = labelText;

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'dev-configurator-number';
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.addEventListener('input', () => {
            this.handleInputChange();
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

    private createToggleField(labelText: string, onChange: (checked: boolean) => void): ToggleField {
        const wrapper = document.createElement('div');
        wrapper.className = 'dev-configurator-field toggle';

        const label = document.createElement('label');
        label.textContent = labelText;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', () => {
            onChange(checkbox.checked);
        });

        label.appendChild(checkbox);
        wrapper.appendChild(label);

        return { wrapper, checkbox };
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

    private updatePresetSelect(): void {
        if (this.activePresetKey && this.presets[this.activePresetKey]) {
            this.presetSelect.value = this.activePresetKey;
        } else {
            this.presetSelect.value = '__custom__';
        }
    }

    private updateGrowthControls(): void {
        this.updateSliderDisplay(this.growthSlider, this.growthValueLabel, this.currentGrowthPercent, (value) => `${value.toFixed(0)}%`);
        this.autoAnimateCheckbox.checked = this.autoAnimate;
        this.updateSliderDisplay(this.autoSpeedSlider, this.autoSpeedValueLabel, this.autoSpeed, (value) => `${value.toFixed(0)}%/s`);
    }

    private updateStructureControls(): void {
        this.updateSliderFromConfig('maxHeight', this.currentConfig.maxHeight);
        this.updateSliderFromConfig('trunkThickness', this.currentConfig.trunkThickness);
        this.updateSliderFromConfig('trunkTaper', this.currentConfig.trunkTaper);
    }

    private updateBranchingControls(): void {
        this.updateSliderFromConfig('branchLevels', this.currentConfig.branchLevels);
        this.updateSliderFromConfig('branchesPerLevel', this.currentConfig.branchesPerLevel);
        this.updateSliderFromConfig('branchAngle', this.currentConfig.branchAngle);
        this.updateSliderFromConfig('branchLength', this.currentConfig.branchLength);
        this.updateSliderFromConfig('branchCurve', this.currentConfig.branchCurve);
        this.updateSliderFromConfig('branchThickness', this.currentConfig.branchThickness);
        this.updateSliderFromConfig('branchThicknessFalloff', this.currentConfig.branchThicknessFalloff);
        const apexToggle = this.toggleFields.get('branchAtApex');
        if (apexToggle) {
            apexToggle.checkbox.checked = this.currentConfig.branchAtApex ?? false;
        }
    }

    private updateBranchChildrenControls(branchChildren?: BranchChildrenConfig): void {
        const toggle = this.toggleFields.get('branchChildrenEnabled');
        const enabled = Boolean(branchChildren && branchChildren.levels > 0);
        if (toggle) {
            toggle.checkbox.checked = enabled;
        }
        if (this.branchChildrenControls) {
            this.branchChildrenControls.style.display = enabled ? 'block' : 'none';
        }

        const defaults: BranchChildrenConfig = branchChildren ?? {
            levels: 0,
            branchesPerLevel: 2,
            lengthScale: 0.6,
            thicknessScale: 0.6,
            angle: 25,
            spread: 50,
            curve: 0,
            leafScale: 0.65,
        };

        this.updateSliderFromConfig('branchChildLevels', defaults.levels);
        this.updateSliderFromConfig('branchChildBranches', defaults.branchesPerLevel);
        this.updateSliderFromConfig('branchChildLengthScale', defaults.lengthScale);
        this.updateSliderFromConfig('branchChildThicknessScale', defaults.thicknessScale);
        this.updateSliderFromConfig('branchChildAngle', defaults.angle);
        this.updateSliderFromConfig('branchChildSpread', defaults.spread);
        this.updateSliderFromConfig('branchChildCurve', defaults.curve);
        this.updateSliderFromConfig('branchChildLeafScale', defaults.leafScale ?? 0.6);
    }

    private updateRootsControls(roots?: RootsConfig): void {
        const toggle = this.toggleFields.get('rootsEnabled');
        const enabled = Boolean(roots?.enabled);
        if (toggle) {
            toggle.checkbox.checked = enabled;
        }
        if (this.rootsControls) {
            this.rootsControls.style.display = enabled ? 'block' : 'none';
        }

        const defaults: RootsConfig = roots ?? {
            enabled: false,
            count: 4,
            length: 0.35,
            thickness: 0.35,
            taper: 0.5,
            spread: 0.5,
            flareHeight: 0.08,
        };

        const rootCountField = this.numberFields.get('rootCount');
        if (rootCountField) {
            rootCountField.input.value = String(defaults.count);
        }

        this.updateSliderFromConfig('rootLength', defaults.length);
        this.updateSliderFromConfig('rootThickness', defaults.thickness);
        this.updateSliderFromConfig('rootTaper', defaults.taper);
        this.updateSliderFromConfig('rootSpread', defaults.spread);
        this.updateSliderFromConfig('rootFlareHeight', defaults.flareHeight);
    }

    private updateCrystalPlacementControls(crystals?: CrystalConfig): void {
        const placements = crystals?.placement && crystals.placement.length > 0
            ? crystals.placement
            : ['trunk'];
        this.crystalPlacementCheckboxes.forEach((checkbox, placement) => {
            checkbox.checked = placements.includes(placement);
        });
    }

    private updateLeafControls(): void {
        const leafShapeSelect = this.selectInputs.get('leafShape');
        if (leafShapeSelect) {
            leafShapeSelect.value = this.currentConfig.leafShape;
        }

        const leafDistributionSelect = this.selectInputs.get('leafDistribution');
        if (leafDistributionSelect) {
            leafDistributionSelect.value = this.currentConfig.leafDistribution;
        }

        this.updateSliderFromConfig('leafSize', this.currentConfig.leafSize);

        const leafCountField = this.numberFields.get('leafCount');
        if (leafCountField) {
            leafCountField.input.value = String(this.currentConfig.leafCount);
        }

        const leafColorInput = this.colorInputs.get('leafColor');
        if (leafColorInput) {
            leafColorInput.value = colorToHex(this.currentConfig.leafColor);
        }
    }

    private updateAppearanceControls(): void {
        const trunkColorInput = this.colorInputs.get('trunkColor');
        if (trunkColorInput) {
            trunkColorInput.value = colorToHex(this.currentConfig.trunkColor);
        }

        this.updateSliderFromConfig('trunkMetallic', this.currentConfig.trunkMetallic ?? 0.2);
        this.updateSliderFromConfig('trunkRoughness', this.currentConfig.trunkRoughness ?? 0.7);
    }

    private updateFeatureControls(): void {
        const flowersToggle = this.toggleFields.get('flowers');
        if (flowersToggle) {
            const enabled = Boolean(this.currentConfig.flowers?.enabled);
            flowersToggle.checkbox.checked = enabled;
            this.flowerControls.style.display = enabled ? 'block' : 'none';
        }
        const flowers = this.currentConfig.flowers;
        const flowerPetalField = this.numberFields.get('flowerPetalCount');
        if (flowerPetalField) {
            flowerPetalField.input.value = String(flowers?.petalCount ?? 6);
        }
        this.updateSliderFromConfig('flowerSize', flowers?.size ?? 0.4);
        const flowerColorInput = this.colorInputs.get('flowerColor');
        if (flowerColorInput) {
            flowerColorInput.value = colorToHex(flowers?.color ?? new THREE.Color(0xffffff));
        }
        const flowerPositionSelect = this.selectInputs.get('flowerPosition');
        if (flowerPositionSelect) {
            flowerPositionSelect.value = flowers?.position ?? 'top';
        }

        const fruitToggle = this.toggleFields.get('fruit');
        if (fruitToggle) {
            const enabled = Boolean(this.currentConfig.fruit?.enabled);
            fruitToggle.checkbox.checked = enabled;
            this.fruitControls.style.display = enabled ? 'block' : 'none';
        }
        const fruit = this.currentConfig.fruit;
        const fruitShapeSelect = this.selectInputs.get('fruitShape');
        if (fruitShapeSelect) {
            fruitShapeSelect.value = fruit?.shape ?? 'sphere';
        }
        this.updateSliderFromConfig('fruitSize', fruit?.size ?? 0.4);
        const fruitCountField = this.numberFields.get('fruitCount');
        if (fruitCountField) {
            fruitCountField.input.value = String(fruit?.count ?? 3);
        }
        const fruitColorInput = this.colorInputs.get('fruitColor');
        if (fruitColorInput) {
            fruitColorInput.value = colorToHex(fruit?.color ?? new THREE.Color(0xff8844));
        }

        const glowToggle = this.toggleFields.get('glow');
        if (glowToggle) {
            const enabled = Boolean(this.currentConfig.glow?.enabled);
            glowToggle.checkbox.checked = enabled;
            this.glowControls.style.display = enabled ? 'block' : 'none';
        }
        const glow = this.currentConfig.glow;
        const glowColorInput = this.colorInputs.get('glowColor');
        if (glowColorInput) {
            glowColorInput.value = colorToHex(glow?.color ?? new THREE.Color(0x4bd1ff));
        }
        this.updateSliderFromConfig('glowIntensity', glow?.intensity ?? 0.8);

        const crystalToggle = this.toggleFields.get('crystals');
        if (crystalToggle) {
            const enabled = Boolean(this.currentConfig.crystals?.enabled);
            crystalToggle.checkbox.checked = enabled;
            this.crystalControls.style.display = enabled ? 'block' : 'none';
        }
        const crystals = this.currentConfig.crystals;
        this.updateSliderFromConfig('crystalSize', crystals?.size ?? 0.4);
        const crystalCountField = this.numberFields.get('crystalCount');
        if (crystalCountField) {
            crystalCountField.input.value = String(crystals?.count ?? 4);
        }
        const crystalColorInput = this.colorInputs.get('crystalColor');
        if (crystalColorInput) {
            crystalColorInput.value = colorToHex(crystals?.color ?? new THREE.Color(0xffffff));
        }
        this.updateCrystalPlacementControls(crystals);
    }

    private updateSliderFromConfig(key: string, value: number): void {
        const field = this.sliderFields.get(key);
        if (!field) {
            return;
        }
        this.updateSliderDisplay(field.input, field.valueLabel, value, field.formatter);
    }

    private updateSliderDisplay(input: HTMLInputElement, label: HTMLSpanElement, value: number, formatter: SliderFormatter): void {
        input.value = String(value);
        label.textContent = formatter(value);
    }

    private handleInputChange(): void {
        if (this.isUpdating) {
            return;
        }
        this.emitChange();
    }

    private emitChange(): void {
        if (!this.onConfigChange) {
            return;
        }
        const change = this.collectChange();
        this.currentConfig = change.config;
        this.currentGrowthPercent = change.growthPercent;
        this.autoAnimate = change.autoAnimate;
        this.autoSpeed = change.autoSpeed;
        this.onConfigChange(change);
    }

    private collectChange(): DevPlantConfiguratorChange {
        const config: AbstractPlantConfig = cloneConfig({
            maxHeight: this.getSliderValue('maxHeight'),
            trunkThickness: this.getSliderValue('trunkThickness'),
            trunkTaper: this.getSliderValue('trunkTaper'),
            branchLevels: Math.round(this.getSliderValue('branchLevels')),
            branchesPerLevel: Math.round(this.getSliderValue('branchesPerLevel')),
            branchAngle: this.getSliderValue('branchAngle'),
            branchLength: this.getSliderValue('branchLength'),
            branchCurve: this.getSliderValue('branchCurve'),
            branchThickness: this.getSliderValue('branchThickness'),
            branchThicknessFalloff: this.getSliderValue('branchThicknessFalloff'),
            branchAtApex: this.toggleFields.get('branchAtApex')?.checkbox.checked ?? false,
            leafShape: this.getSelectValue('leafShape') as LeafShape,
            leafSize: this.getSliderValue('leafSize'),
            leafCount: Math.max(0, Math.round(this.getNumberValue('leafCount', this.currentConfig.leafCount))),
            leafDistribution: this.getSelectValue('leafDistribution') as LeafDistribution,
            leafColor: hexToColor(this.getColorValue('leafColor', this.currentConfig.leafColor)),
            trunkColor: hexToColor(this.getColorValue('trunkColor', this.currentConfig.trunkColor)),
            trunkMetallic: this.getSliderValue('trunkMetallic'),
            trunkRoughness: this.getSliderValue('trunkRoughness'),
        });

        const branchChildrenEnabled = this.toggleFields.get('branchChildrenEnabled')?.checkbox.checked ?? false;
        if (branchChildrenEnabled) {
            config.branchChildren = {
                levels: Math.max(0, Math.round(this.getSliderValue('branchChildLevels'))),
                branchesPerLevel: Math.max(1, Math.round(this.getSliderValue('branchChildBranches'))),
                lengthScale: this.getSliderValue('branchChildLengthScale'),
                thicknessScale: this.getSliderValue('branchChildThicknessScale'),
                angle: this.getSliderValue('branchChildAngle'),
                spread: this.getSliderValue('branchChildSpread'),
                curve: this.getSliderValue('branchChildCurve'),
                leafScale: this.getSliderValue('branchChildLeafScale'),
            };
        }

        const rootsEnabled = this.toggleFields.get('rootsEnabled')?.checkbox.checked ?? false;
        if (rootsEnabled) {
            config.roots = {
                enabled: true,
                count: Math.max(1, Math.round(this.getNumberValue('rootCount', this.currentConfig.roots?.count ?? 4))),
                length: this.getSliderValue('rootLength'),
                thickness: this.getSliderValue('rootThickness'),
                taper: this.getSliderValue('rootTaper'),
                spread: this.getSliderValue('rootSpread'),
                flareHeight: this.getSliderValue('rootFlareHeight'),
            };
        }

        const flowersToggle = this.toggleFields.get('flowers')?.checkbox.checked ?? false;
        if (flowersToggle) {
            config.flowers = {
                enabled: true,
                petalCount: Math.max(0, Math.round(this.getNumberValue('flowerPetalCount', this.currentConfig.flowers?.petalCount ?? 6))),
                size: this.getSliderValue('flowerSize'),
                color: hexToColor(this.getColorValue('flowerColor', this.currentConfig.flowers?.color ?? new THREE.Color(0xffffff))),
                position: this.getSelectValue('flowerPosition') as FlowerPosition,
            };
        }

        const fruitToggle = this.toggleFields.get('fruit')?.checkbox.checked ?? false;
        if (fruitToggle) {
            config.fruit = {
                enabled: true,
                shape: this.getSelectValue('fruitShape') as FruitShape,
                size: this.getSliderValue('fruitSize'),
                color: hexToColor(this.getColorValue('fruitColor', this.currentConfig.fruit?.color ?? new THREE.Color(0xff8844))),
                count: Math.max(0, Math.round(this.getNumberValue('fruitCount', this.currentConfig.fruit?.count ?? 3))),
            };
        }

        const glowToggle = this.toggleFields.get('glow')?.checkbox.checked ?? false;
        if (glowToggle) {
            config.glow = {
                enabled: true,
                intensity: this.getSliderValue('glowIntensity'),
                color: hexToColor(this.getColorValue('glowColor', this.currentConfig.glow?.color ?? new THREE.Color(0x4bd1ff))),
            };
        }

        const crystalsToggle = this.toggleFields.get('crystals')?.checkbox.checked ?? false;
        if (crystalsToggle) {
            config.crystals = {
                enabled: true,
                size: this.getSliderValue('crystalSize'),
                count: Math.max(0, Math.round(this.getNumberValue('crystalCount', this.currentConfig.crystals?.count ?? 4))),
                color: hexToColor(this.getColorValue('crystalColor', this.currentConfig.crystals?.color ?? new THREE.Color(0xffffff))),
                placement: Array.from(this.crystalPlacementCheckboxes.entries())
                    .filter(([, checkbox]) => checkbox.checked)
                    .map(([placement]) => placement),
            };
            if (!config.crystals.placement || config.crystals.placement.length === 0) {
                config.crystals.placement = ['trunk'];
            }
        }

        const growthPercent = Number(this.growthSlider.value);
        const autoAnimate = this.autoAnimateCheckbox.checked;
        const autoSpeed = Number(this.autoSpeedSlider.value);

        return {
            config,
            growthPercent,
            autoAnimate,
            autoSpeed,
        };
    }

    private getSliderValue(key: string): number {
        const field = this.sliderFields.get(key);
        if (!field) {
            return 0;
        }
        return Number(field.input.value);
    }

    private getNumberValue(key: string, fallback: number): number {
        const field = this.numberFields.get(key);
        if (!field) {
            return fallback;
        }
        const value = Number(field.input.value);
        if (!Number.isFinite(value)) {
            return fallback;
        }
        return value;
    }

    private getSelectValue(key: string): string {
        const select = this.selectInputs.get(key);
        return select ? select.value : '';
    }

    private getColorValue(key: string, fallback: THREE.Color): string {
        const input = this.colorInputs.get(key);
        if (!input) {
            return colorToHex(fallback);
        }
        return input.value;
    }

    private exportConfig(): void {
        const change = this.collectChange();
        const json = JSON.stringify(
            {
                ...change.config,
                leafColor: colorToHex(change.config.leafColor),
                trunkColor: colorToHex(change.config.trunkColor),
                flowers: change.config.flowers
                    ? {
                        ...change.config.flowers,
                        color: colorToHex(change.config.flowers.color),
                    }
                    : undefined,
                fruit: change.config.fruit
                    ? {
                        ...change.config.fruit,
                        color: colorToHex(change.config.fruit.color),
                    }
                    : undefined,
                glow: change.config.glow
                    ? {
                        ...change.config.glow,
                        color: colorToHex(change.config.glow.color),
                    }
                    : undefined,
                crystals: change.config.crystals
                    ? {
                        ...change.config.crystals,
                        color: colorToHex(change.config.crystals.color),
                    }
                    : undefined,
            },
            null,
            2
        );

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
        this.showStatus('Copy JSON from the prompt window');
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
}
