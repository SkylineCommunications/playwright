import { BrowserContext, Page, mergeExpects, test } from '@playwright/test';
import { comparisonExpect } from './extensions';
import { TableUtil, PageUtil, WebAPIData } from './util';

const expect = mergeExpects(comparisonExpect);
const visitApp = async (page: Page, context: BrowserContext): Promise<Page> => {
    await page.goto('https://slc-h55-g01.skyline.local/');

    await expect(page.getByText('Sign in')).toBeVisible();
    await page.getByTestId('login.username').locator('input').fill('Cypress_QA');
    await page.getByTestId('login.password').locator('input').fill('Skyline321');
    await page.getByText('Log on').click();

    await expect(page.getByText('DataMiner apps')).toBeVisible();
    await expect(page.getByText('Table Show Case')).toBeVisible();

    return PageUtil.open(context, {
        trigger: () => page.locator('dma-app-icon', { hasText: 'Table Show Case' }).click(),
        onOpen: async (tab) => {
            await PageUtil.wait(tab, 'Internal', 'GetAllApplications');

            await PageUtil.wait(tab, 'Internal', 'GetApplication');
            await expect(tab.locator('#loadingscreen').nth(0)).not.toBeAttached();
            await expect(tab.locator('dma-application')).toBeVisible();
            await expect(tab.locator('.header-title', { hasText: 'Table Show Case' })).toBeVisible();

            const response = await tab.waitForResponse('**/API/v1/Internal.asmx/GetNextQuerySessionPage');
            const body = await response.json() as WebAPIData<any>;
            expect(response.ok()).toBeTruthy();
            expect(body.d.Rows.length).toEqual(50);

            await expect(tab.getByTestId('virtualised-table.body')).toBeVisible();
        }
    });
};

test.use({ viewport: { height: 900, width: 1600 } });

test('Table Templates', async ({ context, page }) => {
    const app = await visitApp(page, context);

    await test.step('[PAGE] Test Results', async () => {
        const cellValue = 'Table.cy.ts';

        // Custom assertions
        await test.step('should have some rows', async () => {
            await expect(TableUtil.getRows(app)).toHaveAtMost(20);
            await expect(TableUtil.getRows(app)).toHaveAtLeast(10);
        });

        // Visual testing
        await test.step('should compare the table with a screenshot', async () => {
            await expect(app.locator('dma-application')).toHaveScreenshot('table.png', { timeout: 5000 });
        });

        // Dispatch events w/ .evaluate()
        await test.step('should assert \'Status\' labels', async () => {
            const labels = app.locator('dma-cc-text-container', { hasText: 'Passed' });
            for (const label of await labels.all())
                await expect(label).toHaveCSS('background-color', 'rgba(102, 187, 106, 0.4)');

            const scroll = async (fromTop: number): Promise<void> => {
                await app.locator('dma-cc-table .table-container').evaluate((x, { y }) => x.scroll(0, y), { y: fromTop });
            };

            await expect(app.locator('tr', { hasText: 'DOMFields.cy.ts' })).toBeVisible();
            await scroll(1500);

            await expect(app.locator('tr', { hasText: 'DOMFields.cy.ts' })).not.toBeVisible();
            await expect(app.locator('tr', { hasText: 'Popups.cy.ts' })).toBeVisible();
            await scroll(2500);

            await expect(app.locator('tr', { hasText: 'Popups.cy.ts' })).not.toBeVisible();
            await expect(app.locator('tr', { hasText: 'overrides.cy.ts' })).toBeVisible();

            await expect(app.locator('dma-cc-text-container', { hasText: 'Failed' })).toHaveCSS('background-color', 'rgba(239, 83, 80, 0.4)');
        });

        // Hover
        await test.step('should filter the table', async () => {
            const allRows = await app.locator('tr:not(.header):not(.buffer)').elementHandles();
            await TableUtil.filter(app, 'maps');
            const filteredRows = await app.locator('tr:not(.header):not(.buffer)').elementHandles();
            await expect(app.locator('tr', { hasText: 'maps' })).toHaveCount(filteredRows.length);

            await TableUtil.filter(app);
            await expect(app.locator('tr:not(.header):not(.buffer)')).toHaveCount(allRows.length);
        });

        // Single selection
        await test.step('should assert the table selection', async () => {
            await TableUtil.filter(app, cellValue);

            const [row] = await TableUtil.select(app, [cellValue]);
            await expect(row).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.15)');

            const label = row.locator('dma-cc-text-container', { hasText: 'Passed' });
            await expect(label).toHaveCSS('background-color', 'rgb(255, 255, 255)');

            await TableUtil.filter(app);
        });

        // Multiple selection
        await test.step('should assert multiple selected rows', async () => {
            const rows = await TableUtil.select(app, ['DOM_IAS.cy.ts', 'DOMState.cy.ts', 'DOMFields.cy.ts', 'page-panel.cy.ts']);
            await expect(app.locator('tr.selected')).toHaveCount(rows.length);
        });

        // Actions
        await test.step('should open a new page', async () => {
            await TableUtil.filter(app, cellValue);
            const row = app.locator('tr', { hasText: cellValue });

            await (await PageUtil.open(context, {
                trigger: async () => await row.locator('td', { hasText: cellValue }).click(),
                onOpen: (tab: Page) => expect(tab.url()).toContain('b83b0bcb-4925-4391-9b39-fb3e72eac413')
            })).close();
        });
    });

    await test.step('[PAGE] Orders', async () => {
        await test.step('should open the \'Orders\' page', async () => {
            await app.getByTitle('Orders', { exact: true }).click();
            const response = await PageUtil.wait(app, 'Internal', 'GetNextQuerySessionPage');

            expect(response.d.Rows.length).toBeLessThan(10);
            await expect(TableUtil.getRows(app)).toHaveCount(response.d.Rows.length);
        });

        await test.step('should have the correct label colors', async () => {
            const labelColorMap = new Map<string, string>([
                ['Unfulfilled', 'rgb(255, 167, 1)'],
                ['Fulfilled', 'rgb(60, 196, 143)'],
                ['Pending Receipt', 'rgb(140, 57, 195)']
            ]);

            const rows = await TableUtil.getRowsArray(app);
            for (const row of rows) {
                const cell = row.locator('td').nth(4);
                const text = await cell.textContent() as string;

                expect(text).not.toBeNull();
                await expect(cell.locator('dma-cc-text-container')).toHaveCSS('background-color', `${labelColorMap.get(text)}`);
            }
        });

        await test.step('should assert all paid and authorized orders', async () => {
            const paidEntries = await TableUtil.select(app, /Paid/g);
            const authorizedEntries = await TableUtil.find(app, /Authorized/g);

            for (const row of paidEntries)
                await expect(row.locator('.icon-container i').nth(0)).toHaveCSS('color', 'rgb(65, 155, 69)');

            await expect(TableUtil.getRows(app)).toHaveCount(paidEntries.length + authorizedEntries.length);
        });
    });

    await test.step('[PAGE] Movies', async () => {
        await test.step('should open the \'Movies\' page', async () => {
            await app.getByTitle('Movies', { exact: true }).click();
            const response = await PageUtil.wait(app, 'Internal', 'GetNextQuerySessionPage');

            expect(response.d.Rows.length).toEqual(30);
            await expect(TableUtil.getRows(app)).toHaveAtMost(response.d.Rows.length);
        });

        await test.step('should assert the original order', async () => {
            const rows = await TableUtil.getRowsArray(app);
            await Promise.all(rows.map((x, i) => expect(x.locator('td').nth(0)).toHaveText(`${i + 1}`.padStart(2, '0'), { useInnerText: true })));
        });

        await test.step('should filter on all movies with less than 100k votes', async () => {
            const contextMenu = await TableUtil.contextColumn(app, 'Votes', 'Filter');
            await contextMenu.locator('dma-button', { hasText: 'no upper bound' }).click();
            await contextMenu.locator('input[type=number]').fill('100000');
            await contextMenu.locator('dma-button', { hasText: 'Apply' }).click();

            const response = await PageUtil.wait(app, 'Internal', 'GetNextQuerySessionPage');
            await expect(TableUtil.getRows(app)).toHaveAtMost(response.d.Rows.length);

            const rows = await TableUtil.getRowsArray(app);
            for (const row of rows) {
                const cell = row.locator('td', { hasText: /[\d]+k/gi });
                const content = await cell.textContent() as string;
                expect(content).not.toBeNull();
                expect(parseInt(content)).toBeLessThan(100);
            }
        });

        await test.step('should assert the selection of a movie', async () => {
            const [row] = await TableUtil.select(app, 'The Great Wall');
            await expect(row).toHaveScreenshot('selected_movie.png');
        });

        await test.step('should restore the table', async () => {
            await app.getByTestId('custom.discard').click();
            await PageUtil.wait(app, 'Internal', 'OpenQuerySession');
            await PageUtil.wait(app, 'Internal', 'GetNextQuerySessionPage');

            const rows = await TableUtil.getRowsArray(app);
            await Promise.all(rows.map((x, i) => expect(x.locator('td').nth(0)).toHaveText(`${i + 1}`.padStart(2, '0'), { useInnerText: true })));
        });
    });
});