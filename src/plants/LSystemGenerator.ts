import type { LSystemRules } from '../types';

/**
 * L-System string generator
 * Expands an axiom using production rules over multiple iterations
 */
export class LSystemGenerator {
    /**
     * Generate an L-system instruction string
     * @param rules - The L-system rules to apply
     * @param iterations - Number of times to apply the rules
     * @returns The final instruction string
     */
    generate(rules: LSystemRules, iterations: number): string {
        let current = rules.axiom;

        for (let i = 0; i < iterations; i++) {
            let next = "";

            for (const char of current) {
                // Replace character if rule exists, otherwise keep as-is
                next += rules.rules[char] || char;
            }

            current = next;
        }

        return current;
    }
}

