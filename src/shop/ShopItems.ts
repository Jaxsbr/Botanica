import type { ShopItem, ShopCategory } from '../types';

/**
 * Mock shop item catalog for Phase 1.2
 * 
 * This defines all available items in the plant nursery shop.
 * Prices and unlock conditions follow GAME_DESIGN.md specifications.
 */

export const SHOP_ITEMS: ShopItem[] = [
    // Tools
    {
        id: 'pruning-shears',
        name: 'Pruning Shears',
        price: 10,
        category: 'tools',
        description: 'Essential tool for trimming and shaping plants',
        icon: '✂️',
        unlocked: true // Available after first fruit sale (future unlock)
    },
    {
        id: 'watering-can',
        name: 'Watering Can',
        price: 5,
        category: 'tools',
        description: 'Basic watering can for hydrating your plants',
        icon: '🚿',
        unlocked: true
    },
    {
        id: 'soil-tester',
        name: 'Soil Tester',
        price: 25,
        category: 'tools',
        description: 'Measure NPK levels precisely',
        icon: '📊',
        unlocked: true // Unlocks after $50 earned (future)
    },
    {
        id: 'ph-meter',
        name: 'pH Meter',
        price: 20,
        category: 'tools',
        description: 'Test soil acidity levels',
        icon: '🧪',
        unlocked: true
    },

    // Pots
    {
        id: 'pot-small-terracotta',
        name: 'Small Terracotta Pot',
        price: 4,
        category: 'pots',
        description: 'Classic clay pot for small plants',
        icon: '🪴',
        unlocked: true
    },
    {
        id: 'pot-large-terracotta',
        name: 'Large Terracotta Pot',
        price: 8,
        category: 'pots',
        description: 'Bigger pot for growing trees',
        icon: '🏺',
        unlocked: true // Unlocks after 3 plants (future)
    },
    {
        id: 'pot-ceramic',
        name: 'Ceramic Pot',
        price: 15,
        category: 'pots',
        description: 'Better water retention, decorative glaze',
        icon: '🫙',
        unlocked: true // Unlocks after 3 plants (future)
    },

    // Fertilizers
    {
        id: 'fertilizer-npk',
        name: 'NPK Fertilizer',
        price: 8,
        category: 'fertilizers',
        description: 'Balanced nutrients for healthy growth',
        icon: '🧴',
        unlocked: true
    },
    {
        id: 'compost-accelerator',
        name: 'Compost Accelerator',
        price: 3,
        category: 'fertilizers',
        description: 'Speed up compost decomposition',
        icon: '⚗️',
        unlocked: true
    },
    {
        id: 'lime',
        name: 'Garden Lime',
        price: 6,
        category: 'fertilizers',
        description: 'Raises soil pH for acidic soil',
        icon: '🧂',
        unlocked: true
    },
    {
        id: 'sulfur',
        name: 'Garden Sulfur',
        price: 6,
        category: 'fertilizers',
        description: 'Lowers soil pH for alkaline soil',
        icon: '🟡',
        unlocked: true
    },

    // Soil
    {
        id: 'potting-soil',
        name: 'Potting Soil',
        price: 5,
        category: 'soil',
        description: 'General purpose planting medium',
        icon: '🟤',
        unlocked: true
    },
    {
        id: 'compost',
        name: 'Premium Compost',
        price: 6,
        category: 'soil',
        description: 'Rich organic matter for soil amendment',
        icon: '♻️',
        unlocked: true
    },
    {
        id: 'perlite',
        name: 'Perlite',
        price: 7,
        category: 'soil',
        description: 'Improves drainage and aeration',
        icon: '⚪',
        unlocked: true
    },

    // Outdoor Plants (Phase 2 - locked for now)
    {
        id: 'plant-young-avocado',
        name: 'Young Avocado Plant',
        price: 15,
        category: 'outdoor-plants',
        description: 'Skip seed phase, ready to grow',
        icon: '🌱',
        unlocked: false
    },
    {
        id: 'plant-mature-avocado',
        name: 'Mature Avocado Tree',
        price: 45,
        category: 'outdoor-plants',
        description: 'Already fruit-bearing',
        icon: '🥑',
        unlocked: false
    },

    // Indoor Plants (Phase 2 - locked for now)
    {
        id: 'plant-fern',
        name: 'Decorative Fern',
        price: 8,
        category: 'indoor-plants',
        description: 'Low-light houseplant',
        icon: '🌿',
        unlocked: false
    }
];

/**
 * Get items by category
 */
export function getItemsByCategory(category: ShopCategory): ShopItem[] {
    return SHOP_ITEMS.filter(item => item.category === category);
}

/**
 * Get unlocked items by category
 */
export function getUnlockedItemsByCategory(category: ShopCategory): ShopItem[] {
    return SHOP_ITEMS.filter(item => item.category === category && item.unlocked);
}

/**
 * Get item by ID
 */
export function getItemById(id: string): ShopItem | undefined {
    return SHOP_ITEMS.find(item => item.id === id);
}

