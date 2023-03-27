import * as React from 'react';
import { ExperimentTimeRangeData } from 'traceviewer-base/src/signals/unit-controller-updated-signal-payload';
import { signalManager, Signals } from 'traceviewer-base/lib/signals/signal-manager';
import { Experiment } from 'tsp-typescript-client';

export interface ReactTimeRangeDataWidgetProps {
    id: string,
    title: string,
}

export interface ReactTimeRangeDataWidgetState {
    activeExperiment?: string,
    activeData?: ExperimentTimeRangeData,
    userInputSelectionStartIsValid: boolean,
    userInputSelectionEndIsValid: boolean,
    userInputSelectionStart?: bigint,
    userInputSelectionEnd?: bigint,
    inputting: boolean,
}

export class ReactTimeRangeDataWidget extends React.Component<ReactTimeRangeDataWidgetProps, ReactTimeRangeDataWidgetState> {

    private selectionStartInput: React.RefObject<HTMLInputElement>;
    private selectionEndInput: React.RefObject<HTMLInputElement>;

    private experimentDataMap: Map<string, ExperimentTimeRangeData>;

    constructor(props: ReactTimeRangeDataWidgetProps) {
        super(props);
        this.selectionEndInput = React.createRef();
        this.selectionStartInput = React.createRef();
        this.experimentDataMap = new Map<string, ExperimentTimeRangeData>();
        this.state = {
            inputting: false,
            userInputSelectionStartIsValid: true,
            userInputSelectionEndIsValid: true,
        };
        signalManager().on(Signals.UNIT_CONTROLLER_UPDATED, this.onUnitControllerUpdated);
        signalManager().on(Signals.EXPERIMENT_SELECTED, this.onExperimentSelected);
    }

    onUnitControllerUpdated = (payload: ExperimentTimeRangeData): void => {
        this.experimentDataMap.set(payload.id, payload);
        this.updateActiveData(payload.id);
    }

    onExperimentSelected = (experiment: Experiment | undefined): void => {
        this.setState(
            { activeExperiment: experiment?.UUID },
            () => this.updateActiveData(experiment?.UUID)
        );
    }

    updateActiveData = (id: string | undefined): void => {
        const activeData = id ? this.experimentDataMap.get(id) : undefined;
        this.setState({ activeData });
    }

    setFormInputValuesToUnitControllersValue = (): void => {
        const { activeData } = this.state;

        const { start , end } = this.getStartAndEnd(activeData?.selectionRange?.start, activeData?.selectionRange?.end, activeData?.offset);
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
        event.preventDefault();
        this.verifyUserInput();
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
    getStartAndEnd = (v1: bigint | string | undefined, v2: bigint | string | undefined, offset: bigint | string | undefined): { start: string, end: string } => {

        if (v1 === undefined || v2 === undefined) {
            return { start: '', end: '' };
        }

        v1 = BigInt(v1);
        v2 = BigInt(v2);
        offset = BigInt(offset || 0);

        const reverse = v1 > v2;
        const start = reverse ? v2 : v1;
        const end = reverse ? v1 : v2;

        // We display values in absolute time with the offset.
        return {
            start: (start + offset).toString(),
            end: (end + offset).toString()
        };
    };

    verifyUserInput = (): void => {
        let { activeData, userInputSelectionStart, userInputSelectionEnd } = this.state;

        // We need at least one value to change: start or end.
        if (!activeData || (!userInputSelectionStart && !userInputSelectionEnd)) {
            this.setFormInputValuesToUnitControllersValue();
            return;
        }
        const { offset, absoluteRange, selectionRange } = activeData;

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
            signalManager().fireUnitControllerManualInput({
                start: userInputSelectionStart - offset,
                end: userInputSelectionEnd - offset
            })
        } else {
            this.setState({
                userInputSelectionStartIsValid: startValid,
                userInputSelectionEndIsValid: endValid,
            });
        }
    };

    render(): React.ReactNode {

        const {
            activeData,
            inputting,
            userInputSelectionStartIsValid,
            userInputSelectionEndIsValid,
        } = this.state;

        let viewRange, selectionRange, offset;
        if (activeData) {
            offset = activeData.offset;
            viewRange = activeData.viewRange;
            selectionRange = activeData.selectionRange;
        }

        const sectionClassName = 'view-range-widget-section';
        const errorClassName = `${sectionClassName} invalid-input`;

        const { start: viewRangeStart, end: viewRangeEnd } = this.getStartAndEnd(viewRange?.start, viewRange?.end, offset);
        const { start: selectionRangeStart, end: selectionRangeEnd } = this.getStartAndEnd(selectionRange?.start, selectionRange?.end, offset);

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
