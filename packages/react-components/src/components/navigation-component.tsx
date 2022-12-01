import React from 'react';
import { AbstractOutputProps, AbstractOutputComponent, AbstractOutputState } from './abstract-output-component';
import { ResponseStatus } from 'tsp-typescript-client/lib/models/response/responses';
import { TimeGraphUnitController } from 'timeline-chart/lib/time-graph-unit-controller';


export type NavigationComponentProps = AbstractOutputProps & {
    setTimeNavigationOpen: (val?: boolean) => void;
}

type NavigationComponentState = AbstractOutputState & {
    selectionRangeStart: bigint | null;
    selectionRangeEnd: bigint | null;
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
            navigating: false,
            invalidInput: false,
            errorMessage: '',
        };

        this.unitController.onSelectionRangeChange(this.onSelectionRangeChange);
    }

    onSelectionRangeChange = () => {
        const { selectionRange, offset } = this.unitController;

        if (!selectionRange) {
            alert('on undefined selection range change');
            this.setState({
                selectionRangeStart: null,
                selectionRangeEnd: null,
                navigating: false,
            })
            return;
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
                this.setState({ selectionRangeStart: value, navigating: true }, () => console.dir(this.state));
                break;
            case 'selectionRangeEnd':
                this.setState({ selectionRangeEnd: value, navigating: true }, () => console.dir(this.state));
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
            this.unitController.selectionRange = undefined;
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

        if (startValid && endValid) {
            this.unitController.selectionRange = {
                start: selectionRangeStart + this.unitController.offset,
                end: selectionRangeEnd + this.unitController.offset
            }
            return;
        } else {
            alert('Please check your inputs :)');
        }
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

    renderMainArea = () => {

        const {
            selectionRangeStart,
            selectionRangeEnd
        } = this.state;

        const { viewRange, offset } = this.unitController;
        const viewRangeStart = (viewRange.start + offset).toString();
        const viewRangeEnd = (viewRange.end + offset).toString();

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
                <form className='section' onSubmit={this.handleSubmit}>
                    <div className='title'>
                        <b>Selection Range</b>
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
                        this.state.navigating &&
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

