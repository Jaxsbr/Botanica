export interface PotConfig {
    size: 'small' | 'large';
    topRadius: number;
    bottomRadius: number;
    height: number;
    color: number;
    rimHeight: number;
}

export const POT_PRESETS: Record<string, PotConfig> = {
    small: {
        size: 'small',
        topRadius: 0.3,
        bottomRadius: 0.22,
        height: 0.55, // Increased from 0.35 for taller pot
        color: 0xc55a3a, // Terracotta orange-brown
        rimHeight: 0.03
    },
    large: {
        size: 'large',
        topRadius: 0.5,
        bottomRadius: 0.38,
        height: 0.9, // Increased from 0.6 for taller pot
        color: 0xc55a3a, // Terracotta orange-brown
        rimHeight: 0.05
    }
};

