export type CursorState =
    | 'default'
    | 'harvest'
    | 'plant'
    | 'plant-disabled'
    | 'build'
    | 'build-disabled';

export class CursorIndicator {
    private readonly element: HTMLElement;
    private currentState: CursorState = 'default';

    constructor(element: HTMLElement) {
        this.element = element;
        this.element.setAttribute('data-cursor-state', this.currentState);
    }

    public setState(state: CursorState): void {
        if (state === this.currentState) {
            return;
        }

        this.currentState = state;
        this.element.setAttribute('data-cursor-state', state);
    }

    public getState(): CursorState {
        return this.currentState;
    }
}

