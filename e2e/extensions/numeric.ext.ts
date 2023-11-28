import { ExpectMatcherState, Locator, expect } from '@playwright/test';
import { assert, AssertionResult } from './_base.ext';

export const comparisonExpect = expect.extend({
    async toHaveAtMost(locator: Locator, expected: number) { return toHaveAtMost(this, locator, expected); },
    async toHaveAtLeast(locator: Locator, expected: number) { return toHaveAtLeast(this, locator, expected); }
});

const toHaveAtMost = async (context: ExpectMatcherState, locator: Locator, expected: number): Promise<AssertionResult> => {
    const result = await assert(async () => {
        const elements = await locator.elementHandles();
        expect(elements.length).toBeLessThanOrEqual(expected);
    });

    const message = !result
        ? () => 'Passed.'
        : () => `${context.utils.matcherHint('toHaveAtMost', undefined, expected)}\nExpected: ${context.utils.printExpected(expected)}\nReceived: ${context.utils.printReceived(result?.actual)}`;

    return {
        message,
        pass: !result,
        expected,
        actual: result?.actual
    }
}

const toHaveAtLeast = async (context: ExpectMatcherState, locator: Locator, expected: number): Promise<AssertionResult> => {
    const result = await assert(async () => {
        const elements = await locator.elementHandles();
        expect(elements.length).toBeGreaterThanOrEqual(expected);
    });

    const message = !result
        ? () => 'Passed.'
        : () => `${context.utils.matcherHint('toHaveAtLeast', undefined, expected)}\nExpected: ${context.utils.printExpected(expected)}\nReceived: ${context.utils.printReceived(result?.actual)}`;

    return {
        message,
        pass: !result,
        expected,
        actual: result?.actual
    }
};