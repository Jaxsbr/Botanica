export interface PotConfig {
    size: 'small' | 'large';
    topRadius: number;
    bottomRadius: number;
    height: number;
    thickness: number; // Wall thickness (outer radius - inner radius)
    color: number;
    rimHeight: number;
    soilHeight: number; // Height of soil from bottom (0-1 as fraction of pot height)
    soilColor: number;
}

export const POT_PRESETS: Record<string, PotConfig> = {
    small: {
        size: 'small',
        topRadius: 0.3,
        bottomRadius: 0.22,
        height: 0.55,
        thickness: 0.02, // 2cm thick walls
        color: 0xc55a3a, // Terracotta orange-brown
        rimHeight: 0.03,
        soilHeight: 1.0, // Soil fills 100% of pot
        soilColor: 0x5C4033 // Dark brown soil
    },
    large: {
        size: 'large',
        topRadius: 0.5,
        bottomRadius: 0.38,
        height: 0.9,
        thickness: 0.025, // 2.5cm thick walls
        color: 0xc55a3a, // Terracotta orange-brown
        rimHeight: 0.05,
        soilHeight: 0.7, // Soil fills 70% of pot
        soilColor: 0x5C4033 // Dark brown soil
    }
};

