export class ScrollStateManager {
    private positions: Map<string, number> = new Map();
    private lastUpdate: number = Date.now();
    private readonly scrollInterval: number;

    constructor(scrollInterval = 300) {
        this.scrollInterval = scrollInterval;
    }

    getOffset(key: string, textLength: number, visibleWidth: number): number {
        if (textLength <= visibleWidth) {
            return 0;
        }

        const now = Date.now();
        const elapsed = now - this.lastUpdate;
        if (elapsed >= this.scrollInterval) {
            this.positions.forEach((pos, mapKey) => {
                const cycleLength = textLength + visibleWidth + 5;
                this.positions.set(mapKey, (pos + 1) % cycleLength);
            });
            this.lastUpdate = now;
        }

        const currentPos = this.positions.get(key) ?? 0;
        if (!this.positions.has(key)) {
            this.positions.set(key, 0);
        }

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
        this.lastUpdate = Date.now();
    }
}

export const scrollManager = new ScrollStateManager();
