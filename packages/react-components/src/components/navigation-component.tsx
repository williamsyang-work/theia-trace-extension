import React from 'react';
import { AbstractOutputProps, AbstractOutputComponent, AbstractOutputState } from './abstract-output-component';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';
import { selection } from 'd3';


export type NavigationComponentProps = AbstractOutputProps & {
    setTimeNavigationOpen: (val?: boolean) => void;
}

type NavigationComponentState = AbstractOutputState & {
    selectionRangeStart: bigint | null;
    selectionRangeEnd: bigint | null;
    receivingInput: boolean;
    navigating: boolean;
    invalidInput: boolean;
    errorMessage: string;
}

export class NavigationComponent extends AbstractOutputComponent<NavigationComponentProps, NavigationComponentState> {

    private unitController: TimeGraphUnitController;

    constructor(props: NavigationComponentProps) {
        super(props);
        this.unitController = this.props.unitController;

        this.state = {
            outputStatus: ResponseStatus.COMPLETED,
            selectionRangeStart: this.props.selectionRange?.getStart() ?? null,
            selectionRangeEnd: this.props.selectionRange?.getEnd() ?? null,
            receivingInput: false,
            navigating: false,
            invalidInput: false,
            errorMessage: '',
        };

        this.unitController.onSelectionRangeChange(this.onSelectionRangeChange);
    }

    onSelectionRangeChange = () => {
        const { selectionRange, offset, viewRangeLength } = this.unitController;

        if (!selectionRange) {
            this.setState({
                selectionRangeStart: null,
                selectionRangeEnd: null,
                navigating: false,
            })
            return;
        }

        if (this.state.receivingInput) {
            this.centerSelection();
        }

        let start = selectionRange.start + offset;
        let end = selectionRange.end + offset;
        let [readableStart, readableEnd] = this.makeValuesHumanReadable(start, end);
        
        this.setState({
            selectionRangeStart: readableStart,
            selectionRangeEnd: readableEnd,
            navigating: false
        });
    }

    handleInputChange = (e: React.FormEvent<HTMLInputElement>) => {

        const value = e.currentTarget.value === '' ? null : BigInt(e.currentTarget.value);
        const key = e.currentTarget.id;

        switch (key) {
            case 'selectionRangeStart':
                this.setState({ selectionRangeStart: value, receivingInput: true });
                break;
            case 'selectionRangeEnd':
                this.setState({ selectionRangeEnd: value, receivingInput: true });
                break;
            default:
                throw 'Key does not exist in TimeNavigationState';
        }
    }

    handleSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        let { selectionRangeStart, selectionRangeEnd } = this.state;
        const isValid = (n: bigint) => (n >= this.unitController.offset) && (n <= (this.unitController.offset + this.unitController.absoluteRange));

        if (selectionRangeStart === null && selectionRangeEnd === null) {
            return;
        }

        if (selectionRangeStart === null || selectionRangeEnd === null) {
            // If only one value is defined, make it the value for both.
            let number = selectionRangeStart ? selectionRangeStart : selectionRangeEnd;
            selectionRangeStart = selectionRangeEnd = number;
        }

        if (typeof selectionRangeStart !== 'bigint' || typeof selectionRangeEnd !== 'bigint') {
            return;  // Need to be explicit because of compiler errors.
        }

        const startValid = isValid(selectionRangeStart);
        const endValid = isValid(selectionRangeEnd);

        console.dir({ selectionRangeStart, selectionRangeEnd, startValid, endValid });

        let navigating;

        if (startValid && endValid) {
            this.unitController.selectionRange = {
                start: selectionRangeStart - this.unitController.offset,
                end: selectionRangeEnd - this.unitController.offset,
            }
            navigating = true;
        } else {
            this.onSelectionRangeChange();
            navigating = false;
        }

        this.setState({ receivingInput: false, navigating })
    }


    makeValuesHumanReadable = (selectionRangeStart: bigint , selectionRangeEnd: bigint) => {

        const { selectionRange } = this.unitController;
        let start = selectionRangeStart;
        let end: bigint | null = selectionRangeEnd;

        if (selectionRangeStart === selectionRangeEnd) {
            // Only show one value if selection range is a single value.
            end = null;
        } else if (selectionRange && selectionRange.start > selectionRange.end) {
            // Start is always less than end.
            start = selectionRangeEnd;
            end = selectionRangeStart;
        }

        return [start, end];
    }

    onlyLetUsersTypeNumbers = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const isNumber = /[0-9]/.test(e.key);
        if (!isNumber) {
            e.preventDefault();
        }
    }

    centerSelection = () => {
        const { selectionRange, viewRangeLength, absoluteRange } = this.unitController;

        if (!selectionRange || viewRangeLength === absoluteRange) {
            return;
        }

        let selectionRangeCenter = (selectionRange.start === selectionRange.end) ? selectionRange.start : (selectionRange.end + selectionRange.start) / BigInt(2);
        let halfViewRange = this.unitController.viewRangeLength / BigInt(2);
        let newStart = selectionRangeCenter - halfViewRange;
        let newEnd = selectionRangeCenter + halfViewRange;

        // Ensure view range doesn't shrink when too far left/right
        let leftOverlap = newStart < BigInt(0) ? - newStart : BigInt(0);
        let rightOverlap = newEnd > absoluteRange ? newEnd - absoluteRange : BigInt(0);
        if (leftOverlap) {
            newEnd -= leftOverlap;
        } else if (rightOverlap) {
            newStart -= rightOverlap;
        }

        // Zoom out to selection range if view range is too small
        if (selectionRange.end - selectionRange.start > viewRangeLength) {
            newStart = selectionRange.start;
            newEnd = selectionRange.end;
        }
        this.unitController.viewRange = {
            start: newStart,
            end: newEnd,
        };

        return;
    }

    renderMainArea = () => {

        const {
            selectionRangeStart,
            selectionRangeEnd
        } = this.state;

        const { viewRange, selectionRange, offset } = this.unitController;
        const viewRangeStart = (viewRange.start + offset).toString();
        const viewRangeEnd = (viewRange.end + offset).toString();
        const selectionStart = selectionRange ? (selectionRange.start + offset).toString() : '';
        const selectionEnd = selectionRange ? (selectionRange.start + offset).toString() : '';
        return (
            <div className='nav-main-content' id='NAV-MAIN-COMPONENT'>
                <div className='section'>
                    <div className='title'>
                        <b>View Range</b>
                    </div>
                    <div className='input'>
                        <span>Start : </span>
                        <span>{viewRangeStart}</span>
                    </div>
                    <div className='input'>
                        <span>End : </span>
                        <span>{viewRangeEnd}</span>
                    </div>
                </div>
                <div className='section'>
                    <div className='title'>
                        <b>Selection Range</b>
                    </div>
                    <div className='input'>
                        <span>Start : </span>
                        <span>{selectionStart}</span>
                    </div>
                    <div className='input'>
                        <span>End : </span>
                        <span>{selectionEnd}</span>
                    </div>
                </div>
                <form className='section' onSubmit={this.handleSubmit}>
                    <div className='title'>
                        <b>Navigate To Time: </b>
                    </div>
                    <div className='input'>
                        <span>Start : </span>
                        <input
                            type='number'
                            id='selectionRangeStart'
                            value={selectionRangeStart !== null ? selectionRangeStart.toString() : ''}
                            onChange={this.handleInputChange}
                            onKeyPress={this.onlyLetUsersTypeNumbers}
                        />
                    </div>
                    <div className='input'>
                        <span>End : </span>
                        <input
                            type='number'
                            id='selectionRangeEnd'
                            value={selectionRangeEnd !== null ? selectionRangeEnd.toString() :  ''}
                            onChange={this.handleInputChange}
                            onKeyPress={this.onlyLetUsersTypeNumbers}
                        />
                    </div>
                    {
                        this.state.receivingInput &&
                        <div className='submit'>
                            <input type='submit' value='Go'/>
                        </div>
                    }
                </form>
            </div>
        )
    }

    protected closeComponent = () => this.props.setTimeNavigationOpen(false);

    protected showOptionsMenu = () => <></>;

    resultsAreEmpty = () => false;

    setFocus = () => document.getElementById('NAV-MAIN-COMPONENT')?.focus();

    
}

