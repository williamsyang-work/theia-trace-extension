import React from 'react';
import { ResponseStatus } from 'tsp-typescript-client';
import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';

export type NavigationComponentProps = AbstractOutputProps & {

}

type NavigationComponentState = AbstractOutputState & {

}

export class NavigationComponent extends AbstractOutputComponent<NavigationComponentProps, NavigationComponentState> {

    constructor(props: NavigationComponentProps) {
        super(props);
        this.state = {
            outputStatus: ResponseStatus.COMPLETED,
        };
    }

    renderMainArea = () => {
        const { viewRange, selectionRange } = this.props.unitController;
        return (
            <div className="navigation-component" id="NAVIGATION_COMPONENT">
                <h4>View Range - </h4><span>{`Start: ${viewRange.start} | End: ${viewRange.end}`}</span>
                <h4>Selection Range - </h4><span>{`Start: ${selectionRange?.start ?? 'Null'} | End: ${selectionRange?.end ?? 'Null'}`}</span>
            </div>
        )
    }

    resultsAreEmpty = () => {
        return false;
    }

    setFocus = () => {
        document.getElementById("NAVIGATION_COMPONENT")?.focus();
    }
}