import { BrowserContext, Page, ViewportSize } from '@playwright/test';
interface TabOptions {
    trigger: () => void | Promise<void>;
    onOpen?: (tab: Page) => void | Promise<void>;
    viewport?: ViewportSize
}

type API = 'Json' | 'Dashboards' | 'Internal';
export type WebAPIData<T> = { d: T };

export class PageUtil {
    public static async open(context: BrowserContext, options: TabOptions): Promise<Page> {
        const tabPromise = context.waitForEvent('page');
        await options.trigger();
        const page = await tabPromise;

        if (options.viewport)
            await page.setViewportSize(options.viewport);

        if (options.onOpen)
            await options.onOpen(page);

        return page;
    }

    public static async wait<T = any>(page: Page, api: API, method: string): Promise<WebAPIData<T>> {
        const response = await page.waitForResponse(`**/API/v1/${api}.asmx/${method}`, { timeout: 30_000 });
        return response.json() as Promise<WebAPIData<T>>;
    }
}