import { AssertionError } from 'assert';

type AssertionFailure = {
    matcherResult: AssertionError;
}

export type AssertionResult = {
    message: () => string;
    pass: boolean;
    expected: unknown;
    actual?: unknown;
}

export const assert = async (assertion: () => Promise<void>): Promise<AssertionError | void> => {
    try {
        await assertion();
    } catch (e) {
        return (e as AssertionFailure).matcherResult;
    }
}