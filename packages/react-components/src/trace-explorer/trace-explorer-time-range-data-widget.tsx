import * as React from 'react';
import { TimelineChart } from 'timeline-chart/lib/time-graph-model';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { signalManager, Signals } from 'traceviewer-base/lib/signals/signal-manager';
import { debounce } from 'lodash';

export interface ReactTimeRangeDataWidgetProps {
    id: string,
    title: string,
}

export interface ReactTimeRangeDataWidgetState {
    unitController?: TimeGraphUnitController,
    viewRange?: TimelineChart.TimeGraphRange,
    selectionRange?: TimelineChart.TimeGraphRange,
    offset?: bigint,
    userInputSelectionStartIsValid: boolean,
    userInputSelectionEndIsValid: boolean,
    userInputSelectionStart?: bigint,
    userInputSelectionEnd?: bigint,
    inputting: boolean,
}

export class ReactTimeRangeDataWidget extends React.Component<ReactTimeRangeDataWidgetProps, ReactTimeRangeDataWidgetState> {

    private selectionStartInput: React.RefObject<HTMLInputElement>;
    private selectionEndInput: React.RefObject<HTMLInputElement>;

    private viewRangeTimeout?: ReturnType<typeof setTimeout>;
    private selectionRangeTimeout?: ReturnType<typeof setTimeout>;

    constructor(props: ReactTimeRangeDataWidgetProps) {
        super(props);
        this.selectionEndInput = React.createRef();
        this.selectionStartInput = React.createRef();
        this.state = {
            inputting: false,
            userInputSelectionStartIsValid: true,
            userInputSelectionEndIsValid: true,
        };
        signalManager().on(Signals.NEW_ACTIVE_VIEW_RANGE, this.onViewRangeChanged);
        signalManager().on(Signals.NEW_ACTIVE_SELECTION_RANGE, this.onSelectionRangeChanged);
        signalManager().on(Signals.TRACEVIEWERTAB_ACTIVATED, () => console.dir(`we hear it in here :)`));
    }

    onViewRangeChanged = (s: string): void => {
        const [start, end, offset] = s.split("|");
        const viewRange = {
            start: BigInt(start) + BigInt(offset),
            end: BigInt(end) + BigInt(offset),
        }

        // Debounce
        if (this.viewRangeTimeout) {
            clearTimeout(this.viewRangeTimeout);
        }
        this.viewRangeTimeout = setTimeout(() => {
            this.setState({ viewRange }, this.setFormInputValuesToUnitControllersValue);
        }, 250);
    }
    
    onSelectionRangeChanged = (s: string): void => {
        const [start, end, offset] = s.split("|");
        let selectionRange: TimelineChart.TimeGraphRange | undefined = undefined;
        if (start && end) {
            selectionRange = {
                start: BigInt(start) + BigInt(offset),
                end: BigInt(end) + BigInt(offset),
            }
        }

        // Debounce
        if (this.selectionRangeTimeout) {
            clearTimeout(this.selectionRangeTimeout);
        }
        this.selectionRangeTimeout = setTimeout(() => {
            this.setState({ selectionRange }, this.setFormInputValuesToUnitControllersValue);
        }, 250);
    }

    setFormInputValuesToUnitControllersValue = (): void => {
        const { selectionRange } = this.state;
        const { start , end } = this.getStartAndEnd(selectionRange?.start, selectionRange?.end);
        if (this.selectionStartInput.current && this.selectionEndInput.current) {
            this.selectionStartInput.current.value = start;
            this.selectionEndInput.current.value = end;
        }
        this.setState({
            userInputSelectionEndIsValid: true,
            userInputSelectionStartIsValid: true,
            userInputSelectionEnd: undefined,
            userInputSelectionStart: undefined,
            inputting: false,
        });
    };

    onChange = (event: React.FormEvent<HTMLInputElement>, inputIndex: number): void => {
        event.preventDefault();
        if (!this.state.inputting) {
            this.setState({ inputting: true });
        }

        // BigInt("") => 0 but we want that to be undefined.
        const value = event.currentTarget.value === '' ? undefined : BigInt(event.currentTarget.value);

        switch (inputIndex) {
            case 0:
                this.setState({ userInputSelectionStart: value });
                return;
            case 1:
                this.setState({ userInputSelectionEnd: value });
                return;
            default:
                throw Error('Input index is invalid!');
        }

    };

    onSubmit = (event: React.FormEvent): void => {
        this.verifyUserInput();
        event.preventDefault();
    };

    onCancel = (): void => {
        this.setFormInputValuesToUnitControllersValue();
    };

    /**
     *
     * Sometimes the unitController's selection range has a start that's larger than the end (they're reversed).
     * This always sets the lesser number as the start.
     * @param value1
     * @param value2
     * @returns { start: string, end: string }
     */
    getStartAndEnd = (v1: bigint | string | undefined, v2: bigint | string | undefined): { start: string, end: string } => {

        if (v1 === undefined || v2 === undefined) {
            return { start: '', end: '' };
        }

        v1 = BigInt(v1);
        v2 = BigInt(v2);

        const reverse = v1 > v2;
        const start = reverse ? v2 : v1;
        const end = reverse ? v1 : v2;

        // We display values in absolute time with the offset.
        return {
            start: (start).toString(),
            end: (end).toString()
        };
    };

    verifyUserInput = (): void => {
        let { unitController, userInputSelectionStart, userInputSelectionEnd } = this.state;

        // We need at least one value to change: start or end.
        if (!unitController || (!userInputSelectionStart && !userInputSelectionEnd)) {
            this.setFormInputValuesToUnitControllersValue();
            return;
        }
        const { offset, absoluteRange, selectionRange } = unitController;

        // If there is no pre-existing selection range and the user only inputs one value
        // Make that both selection range start and end value
        if (!selectionRange && (!userInputSelectionEnd || !userInputSelectionStart)) {
            userInputSelectionStart = userInputSelectionStart || userInputSelectionEnd;
            userInputSelectionEnd = userInputSelectionEnd || userInputSelectionStart;
        }

        // If there is no user input for start or end, set that value to the current unit controller value.
        userInputSelectionStart = typeof userInputSelectionStart === 'bigint' ? userInputSelectionStart :
            // Below is added to satisfy typescript compiler
            !selectionRange ? offset :
            // We also need to account for backwards selection start / end here.
            selectionRange.start <= selectionRange.end ? selectionRange.start + offset :
            selectionRange.end + offset;
        userInputSelectionEnd = typeof userInputSelectionEnd === 'bigint' ? userInputSelectionEnd :
            !selectionRange ? offset :
            selectionRange.start <= selectionRange.end ? selectionRange.end + offset :
            selectionRange.start + offset;

        const isValid = (n: bigint): boolean => (n >= offset) && (n <= absoluteRange + offset);
        const startValid = isValid(userInputSelectionStart);
        const endValid = isValid(userInputSelectionEnd);

        if (startValid && endValid) {
            unitController.selectionRange = {
                start: userInputSelectionStart - offset,
                end: userInputSelectionEnd - offset
            };
        } else {
            this.setState({
                userInputSelectionStartIsValid: startValid,
                userInputSelectionEndIsValid: endValid,
            });
        }
    };

    render(): React.ReactNode {

        const {
            viewRange,
            selectionRange,
            inputting,
            userInputSelectionStartIsValid,
            userInputSelectionEndIsValid,
         } = this.state;

        const sectionClassName = 'view-range-widget-section';
        const errorClassName = `${sectionClassName} invalid-input`;

        const { start: viewRangeStart, end: viewRangeEnd } = this.getStartAndEnd(viewRange?.start, viewRange?.end);
        const { start: selectionRangeStart, end: selectionRangeEnd } = this.getStartAndEnd(selectionRange?.start, selectionRange?.end);

        const startValid = inputting ? userInputSelectionStartIsValid : true;
        const endValid = inputting ? userInputSelectionEndIsValid : true;

        return (
            <div className='trace-explorer-item-properties'>
                <div className='trace-explorer-panel-content'>
                    <form onSubmit={this.onSubmit}>
                        {(!startValid || !endValid) && (
                            <div className={errorClassName}>
                                <label htmlFor="errorMessage">
                                    <h4 className='outputs-element-name'><i>Invalid values</i></h4>
                                </label>
                            </div>
                        )}
                        <div className={sectionClassName}>
                            <label htmlFor="viewRangeStart">
                                <h4 className='outputs-element-name'>View Range Start:</h4>
                                {viewRangeStart}
                            </label>
                        </div>
                        <div className={sectionClassName}>
                            <label htmlFor="viewRangeEnd">
                                <h4 className='outputs-element-name'>View Range End:</h4>
                                {viewRangeEnd}
                            </label>
                        </div>
                        <div className={startValid ? sectionClassName : errorClassName}>
                            <label htmlFor="selectionRangeStart">
                                <h4 className='outputs-element-name'>{userInputSelectionStartIsValid ? 'Selection Range Start:' : '* Selection Range Start:'}</h4>
                            </label>
                            <input
                                ref={this.selectionStartInput}
                                type="number"
                                defaultValue={selectionRangeStart}
                                onChange={e => this.onChange(e, 0)}
                            />
                        </div>
                        <div className={endValid ? sectionClassName : errorClassName}>
                            <label htmlFor="selectionRangeEnd">
                                <h4 className='outputs-element-name'>{endValid ? 'Selection Range End:' : '* Selection Range End:'}</h4>
                            </label>
                            <input
                                ref={this.selectionEndInput}
                                type="number"
                                defaultValue={selectionRangeEnd}
                                onChange={e => this.onChange(e, 1)}
                            />
                        </div>
                        {inputting && (<div className={sectionClassName}>
                            <input type="submit" value="Submit"/><input type="button" onClick={this.onCancel} value="Cancel"/>
                        </div>)}
                    </form>
                </div>
            </div>
        );
    }
}
