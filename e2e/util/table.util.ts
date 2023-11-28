import { Locator, Page, expect } from "@playwright/test";

export class TableUtil {
    public static async filter(page: Page, value?: string): Promise<void> {
        const searchHandle = page.locator('.global-filter');
        await page.locator('dma-cc-table').hover();
        await expect(searchHandle).toBeVisible();

        await searchHandle.click();
        await (value ? searchHandle.locator('input').fill(value) : searchHandle.locator('input').clear());
    }

    private static async selectByArray(page: Page, values: string[]): Promise<Locator[]> {
        const multiple = values.length > 1;
        const rows: Locator[] = [];

        if (multiple) await page.keyboard.down('Control');
        for (const value of values) {
            const row = page.locator('tr', { hasText: value });
            await row.click();
            rows.push(row);
        }
        if (multiple) await page.keyboard.up('Control');
        return rows;
    };


    public static async select(page: Page, value: string | RegExp | string[]): Promise<Locator[]> {
        if (value instanceof Array)
            return this.selectByArray(page, value);

        const rows = await page.locator('tr', { hasText: value }).all();
        const multiple = rows.length > 1;

        if (multiple) await page.keyboard.down('Control');
        for (const row of rows)
            await row.click();
        if (multiple) await page.keyboard.up('Control');

        return rows;
    }

    private static _getRows(page: Page, filter?: string | RegExp): Locator {
        return page.getByTestId('virtualised-table.body').locator('tr:not(.buffer):not(.header)', { hasText: filter });
    }

    public static getRows(page: Page): Locator {
        return this._getRows(page);
    }

    public static async getRowsArray(page: Page): Promise<Locator[]> {
        return this._getRows(page).all();
    }

    public static async find(page: Page, value: string | RegExp): Promise<Locator[]> {
        return this._getRows(page, value).all();
    }

    public static getColumn(page: Page, name: string | RegExp): Locator {
        return page.getByTestId('virtualised-table.header').locator('th', { hasText: name });
    }

    public static async contextColumn(page: Page, columnName: string | RegExp, option: string | RegExp | number): Promise<Locator> {
        const column = this.getColumn(page, columnName);
        await column.click({ button: 'right' });

        const contextMenu = page.locator('dma-cc-context-menu');
        await expect(contextMenu).toBeVisible();

        if (typeof option === 'number')
            await contextMenu.locator('.option').nth(option).click();
        else
            await contextMenu.locator('.option', { hasText: option }).click();

        return contextMenu;
    }
}