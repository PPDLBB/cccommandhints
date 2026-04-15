export class ScrollStateManager {
    private positions = new Map<string, number>();
    private lastUpdates = new Map<string, number>();
    private readonly scrollInterval: number;

    constructor(scrollInterval = 300) {
        this.scrollInterval = scrollInterval;
    }

    getOffset(key: string, textLength: number, visibleWidth: number): number {
        if (textLength <= visibleWidth) {
            return 0;
        }

        const now = Date.now();

        if (!this.positions.has(key)) {
            this.positions.set(key, 0);
            this.lastUpdates.set(key, now);
        }

        const lastUpdate = this.lastUpdates.get(key) ?? now;
        const elapsed = now - lastUpdate;

        if (elapsed >= this.scrollInterval) {
            const pos = this.positions.get(key) ?? 0;
            const cycleLength = textLength + visibleWidth + 5;
            this.positions.set(key, (pos + 1) % cycleLength);
            this.lastUpdates.set(key, now);
        }

        const currentPos = this.positions.get(key) ?? 0;

        if (currentPos < visibleWidth) {
            return 0;
        }
        if (currentPos < textLength + visibleWidth) {
            return currentPos - visibleWidth;
        }

        return Math.max(0, textLength - visibleWidth);
    }

    reset(): void {
        this.positions.clear();
        this.lastUpdates.clear();
    }
}

export const scrollManager = new ScrollStateManager();