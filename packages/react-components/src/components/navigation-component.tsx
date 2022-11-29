import React from 'react';
import { ResponseStatus } from 'tsp-typescript-client';
import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { values } from 'lodash';

export type NavigationComponentProps = AbstractOutputProps & {
    setTimeNavigationOpen: (val?: boolean) => void;
}

type NavigationComponentState = {
    viewRangeStart: string;
    viewRangeEnd: string;
    selectionRangeStart: string | null;
    selectionRangeEnd: string | null;
}

export class NavigationComponent extends React.Component<NavigationComponentProps, NavigationComponentState> {

    constructor(props: NavigationComponentProps) {
        super(props);
        const { viewRange, selectionRange } = this.props.unitController
        this.state = {
            viewRangeStart: viewRange.start.toString(),
            viewRangeEnd: viewRange.end.toString(),
            selectionRangeStart: selectionRange?.start.toString() ?? null,
            selectionRangeEnd: selectionRange?.end.toString() ?? null
        };

        this.props.unitController.onViewRangeChanged(this.onViewRangeChange);
        this.props.unitController.onSelectionRangeChange(this.onSelectionRangeChange);

    }

    onViewRangeChange = () => {
        this.setState({
            viewRangeStart: this.props.unitController.viewRange.start.toString(),
            viewRangeEnd: this.props.unitController.viewRange.end.toString(),
        })
    }

    onSelectionRangeChange = () => {
        this.setState({
            selectionRangeStart: this.props.unitController.selectionRange?.start.toString() ?? null,
            selectionRangeEnd: this.props.unitController.selectionRange?.end.toString() ?? null,
        })
    }

    handleInputChange = (e: React.FormEvent<HTMLInputElement>, key: string) => {

        const value = e.currentTarget.value;
        const valid = this.isValueValid(value);

        let { viewRange, selectionRange } = this.props.unitController

        switch(key) {
            case 'viewRangeStart':
                valid ? this.props.unitController.viewRange = { ...viewRange, start: BigInt(value) } : this.setState({ viewRangeStart: value });
                break;
            case 'viewRangeEnd':
                valid ? this.props.unitController.viewRange = { ...viewRange, end: BigInt(value) } : this.setState({ viewRangeEnd: value });
                break;
            case 'selectionRangeStart':
                if (valid) {
                    const end = selectionRange?.end ?? BigInt(value);
                    this.props.unitController.selectionRange = { end, start: BigInt(value) }
                } else {
                    this.setState({ selectionRangeEnd: value });
                }
                break;
            case 'selectionRangeEnd':
                if (valid) {
                    const start = selectionRange?.start ?? BigInt(value);
                    this.props.unitController.selectionRange = { start, end: BigInt(value) }
                } else {
                    this.setState({ selectionRangeEnd: value });
                }
                break;
            default:
                throw "Key does not exist in TimeNavigationComponentState";
        }
    }

    isValueValid = (input: bigint | string) => {
        let val = BigInt(input);
        const min = BigInt(0);
        const max = this.props.unitController.absoluteRange + BigInt(1);  // Max wasn't valid for some reason.
        return (val >= min) && (val <= max);
    }

    render = () => {
        const { unitController, setTimeNavigationOpen } = this.props;
        const { viewRange, selectionRange } = unitController;
        const leftPanelWidth = this.props.style.handleWidth ?? 30;

        const widgetStyle = {
            width: leftPanelWidth,
        }

        const mainContentStyle = {
            paddingTop: '6px',
            // paddingLeft: '5px',
        }

        const {
            viewRangeStart,
            viewRangeEnd,
            selectionRangeStart,
            selectionRangeEnd
        } = this.state;

        return (
            <div
                className={"output-container " + this.props.className}
                style={{ ...this.props.style, width: this.props.outputWidth, marginTop: '30px', height: 'fit-content' }}
            >
                <div className="widget-handle" style={widgetStyle}>
                    <button className='remove-component-button' onClick={() => setTimeNavigationOpen(false)}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className="nav-main-content" style={mainContentStyle}>
                    <div className="section">
                        <b>View Range - </b>
                        <span>Start : </span>
                        <input
                            type="number"
                            value={viewRangeStart}
                            onChange={(e) => this.handleInputChange(e, 'viewRangeStart')}
                            style={{
                                color: this.isValueValid(viewRangeStart) ? 'black' : 'red',
                            }}
                        />
                        <span>End : </span>
                        <input
                            type="number"
                            value={viewRangeEnd}
                            onChange={(e) => this.handleInputChange(e, 'viewRangeEnd')}
                            style={{
                                color: this.isValueValid(viewRangeEnd) ? 'black' : 'red',
                            }}
                        />
                    </div>
                    <div className="section">
                        <b>Selection Range - </b>
                        <span>Start : </span>
                        <input
                            type="number"
                            value={selectionRangeStart ?? ''}
                            onChange={(e) => this.handleInputChange(e, 'selectionRangeStart')}
                            style={{
                                color: this.isValueValid(selectionRangeStart ?? '') ? 'black' : 'red',
                            }}
                        />
                        <span>End : </span>
                        <input
                            type="number"
                            value={selectionRangeEnd ?? ''}
                            onChange={(e) => this.handleInputChange(e, 'selectionRangeEnd')}
                            style={{
                                color: this.isValueValid(selectionRangeEnd ?? '') ? 'black' : 'red',
                            }}
                        />
                    </div>
                </div>
            </div>
        )
    }


}
