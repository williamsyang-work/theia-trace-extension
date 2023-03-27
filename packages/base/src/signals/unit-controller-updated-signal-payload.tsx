import { TimelineChart } from 'timeline-chart/lib/time-graph-model';

export interface ExperimentTimeRangeData {
    id: string,
    viewRange: TimelineChart.TimeGraphRange,
    selectionRange: TimelineChart.TimeGraphRange,
    offset: bigint,
    absoluteRange: bigint,
}