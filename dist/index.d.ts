export interface IFSM {
    onStart(): void;
    onStop(): void;
    onSend(name: string): void;
    getCurrentStateId(): string;
}
export interface IStateNode {
    readonly id: string;
    onUpdate(dt: number): void;
    onPrepare(): Promise<void>;
    onEnter(): Promise<void>;
    onExit(): Promise<void>;
}
export interface IFSMConfig {
    id: string;
    initial: string;
    states: {
        [key: string]: IStateConfig;
    };
}
interface IStateConfig {
    initial?: string;
    states?: {};
    on?: {
        [key: string]: string;
    };
}
interface IConstructableStateNode {
    new (fsm: IFSM, parent: IStateNode | null): IStateNode;
}
export declare abstract class StateNode implements IStateNode {
    protected readonly fsm: IFSM;
    protected readonly parent: IStateNode | null;
    constructor(fsm: IFSM, parent: IStateNode | null);
    abstract id: string;
    /**
     * @description The method is called before enter to the state and before 'onUpdate' method is run.
     * Here you can prepare some props before all activities.
     */
    onPrepare(): Promise<void>;
    /**
     * @description The method is called when we enter to a new state.
     * Here you can subscribe to some events, create smth and so on.
     */
    onEnter(): Promise<void>;
    /**
     * @description The method is called when we change to another state.
     * Here you can unsubscribe to old events, reset smth and so on.
     */
    onExit(): Promise<void>;
    /**
     * @description The method is called after the state was prepared.
     * @param {number} dt
     */
    onUpdate(dt: number): void;
}
export declare class FSM implements IFSM {
    private readonly states;
    private _transactionsSequence;
    private _isSentWarnings;
    private _isStopped;
    private _isStarted;
    private _graph;
    private _leafsStack;
    private _currentOrder;
    private _statesStack;
    constructor(config: IFSMConfig, states: Map<string, IConstructableStateNode>);
    /**
     * @description Starts the machine. Creates the initial state
     */
    onStart(): Promise<void>;
    /**
     * @description Stops the machine.
     */
    onStop(): Promise<void[] | undefined>;
    /**
     * @description Sends an event to the machine.
     * @param {string} name
     */
    onSend(eventName: string): void;
    /**
     * @description Tick all states.
     * @param {number} dt
     */
    onUpdate(dt: number): void;
    /**
     * @description Get id of current running state.
     * @returns {string}
     */
    getCurrentStateId(): string;
    getCurrentState(): IStateNode | null;
    private _nextTransation;
    private _executeTransition;
    private _makeGraph;
    private _exitFromStateByEvent;
    private _enterToStateById;
    private _getNextStateUniqueIdByEvent;
    private _getParentUniqueId;
    private _checkAmongAllEvent;
    private _checkEventInStack;
    private _checkMachineConfig;
    private _checkStatesList;
    private _checkConfig;
    private _checkTransions;
    private _warn;
}
export {};
