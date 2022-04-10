import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';

export interface HistoryItem {
    selectionRange: TimelineChart.TimeGraphRange | undefined;
    viewRange: TimelineChart.TimeGraphRange;
}

export class UnitControllerHistoryHandler {
    protected stack: Array<HistoryItem>;
    protected i: number = 0;
    protected max: number = 0;
    protected timeout?: ReturnType<typeof setTimeout>;
    protected unitController: TimeGraphUnitController;
    protected restoring: boolean = false;

    constructor(uC: TimeGraphUnitController) {
        this.stack = new Array();
        this.unitController = uC;
    }

    public addCurrentState(): void {
        const { selectionRange, viewRange } = this.unitController;
        this.waitToAdd({ selectionRange, viewRange });
    }

    public undo(): void {
        if (this.canUndo) {
            this.i--;
            this.restore();
        }
    }

    public redo(): void {
        if (this.canRedo) {
            this.i ++;
            this.restore();
        }
    }

    public clear(): void {
        this.i = 0;
        this.max = 0;
    }

    private waitToAdd(item: HistoryItem): void {
        /**
         * Since scrolling with the scroll-bar or dragging handle triggers many changes per second
         * we don't want to actually push if another request comes in quick succession.
         * 
         * Don't add anything if we are currently restoring.
         */
        if (this.restoring) {
            return;
        }
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(() => this.add(item), 500);
    }

    private add(item: HistoryItem): void {
        this.i++;
        this.max = this.i;
        this.stack[this.i] = item;
    }

    private restore(): void {
        this.restoring = true;
        const { selectionRange, viewRange } = this.stack[this.i];
        this.unitController.selectionRange = selectionRange;
        this.unitController.viewRange = viewRange;
        this.restoring = false;
    }

    private get canRedo(): boolean {
        return this.i < this.max;
    }

    private get canUndo(): boolean {
        return this.i > 1;
    }

}
