
// TODO: Add parallel states
// TODO: Create arrow functions insted of class methods to hide FSM functional
// TODO: May remove the children / fullPath ? They are not used now
// TODO: Get all events names in the beginning to check they in 'onStart' method and delete _checkAmongAllEvent method

const last = (collection: any[]) => collection[collection.length - 1];

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
    }
}

interface IStatesStackLeaf {
    order: number;
    state: IStateNode;
    running: boolean;
}

interface IGraphLeaf {
    id: string;
    parent: string;
    transitions: { [key: string]: string };
    fullPath: string;
    initial: string;
    children?: string[];
}

interface IGraph {
    [key: string]: IGraphLeaf
}

interface IStackLeaf extends IGraphLeaf {
    order: number;
}

interface IStateConfig {
    initial?: string;
    states?: {};
    on?: {
        [key: string]: string
    }
}

interface IConstructableStateNode {
    new(fsm: IFSM, parent: IStateNode | null): IStateNode;
}

export abstract class StateNode implements IStateNode {
    constructor(
        private readonly fsm: IFSM,
        private readonly parent: IStateNode | null
    ) {}

    public abstract id: string;

    /**
     * @description The method is called before enter to the state and before 'onUpdate' method is run. 
     * Here you can prepare some props before all activities. 
     */
    public async onPrepare(): Promise<void> {}

    /**
     * @description The method is called when we enter to a new state. 
     * Here you can subscribe to some events, create smth and so on. 
     */
    public async onEnter(): Promise<void> {};

    /**
     * @description The method is called when we change to another state. 
     * Here you can unsubscribe to old events, reset smth and so on. 
     */
    public async onExit(): Promise<void> {};

    /**
     * @description The method is called after the state was prepared.
     * @param {number} dt 
     */
    public onUpdate(dt: number) {}
}


export class FSM implements IFSM {
    private _rooId = 'Root';
    private _isStopped = false;
    private _isStarted = false;
    private _graph: IGraph = {};
    private _leafsStack: IStackLeaf[] = [];
    private _currentOrder = -1;
    private _statesStack: IStatesStackLeaf[] = [];

    constructor(config: IFSMConfig, private readonly states: Map<string, IConstructableStateNode>) {

        if (Object.keys(config).length === 0) {
            console.error(`Is not valid config: "${config}"`);
            throw new Error();
        }

        /**
         * Check config and states
         */
        this._checkMachineConfig(config);


        /**
         * Create one-dimensional graph
         */
        this._graph = this._makeGraph(config);
    }

    /**
     * @description Starts the machine. Creates the initial state
     */
    public async onStart() {
        if (this._isStopped) return;
        if (this._isStarted) return;

        this._isStarted = true;

        this._enterToStateById(this._rooId);

        await this._executeTransition();
    }

    /**
     * @description Stops the machine.
     */
    public async onStop() {
        if (this._isStopped) return;
        if (!this._isStarted) return;
    
        this._isStopped = true;
        this._graph = {};
        this._leafsStack = [];
        this._currentOrder = -1;
       
        const promises = this._statesStack.map(({ state }) => state.onExit());
        this._statesStack = [];

        return Promise.all(promises);
    }

    /**
     * @description Sends an event to the machine.
     * @param {string} name
     */
    public async onSend(eventName: string) {
        if (this._isStopped) return;
        if (!this._isStarted) return;

        if (!this._checkAmongAllEvent(this._graph, eventName)) {
            console.warn(`Event: "${eventName}" is not registered in the machine`);
            return;
        }

        if (!this._checkEventInStack(eventName)) {
            console.warn(`Event: "${eventName}" is not found in the current state tree`);
            return;
        }
    
        this._exitFromStateByEvent(eventName);

        await this._executeTransition();    
    }

    /**
     * @description Tick all states.
     * @param {number} dt
     */
    public onUpdate(dt: number) {
        this._statesStack.forEach(({state, running}) =>  running && state.onUpdate(dt));
    }

    /**
     * @description Get id of current running state.
     * @returns {string}
     */
    public getCurrentStateId(): string {
        if (!this._isStarted) {
            console.warn('Machine is not started yet !!!');
            return '';
        }

        if (this._isStopped) {
            console.warn('Machine is already stopped !!!');
            return '';
        }

        return last(this._statesStack).state.id;
    }

    private async _executeTransition() {
        const newStateStack = [];

        /**
         * Clear stack from closed states 
         * Exit from closed states
         */
        for (let i = this._statesStack.length - 1; i >= 0; i -= 1) {
            /**
             * Get state id
             */
            const { state, order: stateOrder } = this._statesStack[i];
            const stateId = state.id;

            /**
             * Find a config with the same id as the state id
             */
            const config = this._leafsStack.find((leaf) => {
                return leaf.id === stateId && leaf.order === stateOrder;
            });

            /**
             * If the state is not in the configuration list, It means this state was closed
             * so we need to call 'onExit' method by the closed state
             * 
             * Otherwise we push the state to a new stack
             */
            if (!config) {
                await state.onExit();
                this._statesStack[i].running = false;
            } else {
                newStateStack.push({ state, order: stateOrder, running: true });
            }
        }

        /**
         * Added new states to stack
         * ATTANTION: Start loop from index - 1, because first elem is "Root". We dont use it
         */
        for (let i = 1; i < this._leafsStack.length; i += 1) {
            const leaf = this._leafsStack[i];

            /**
             * Find a state with the same id as the config id
             */
            const state = newStateStack.find((l) => {
                return l.state.id === leaf.id && l.order === leaf.order;
            });


            /**
             * If a state is not found to create it 
             */
            if (!state) {
                /**
                 * Find class in the list
                 */
                if (!this.states.has(leaf.id)) {
                    throw new Error(`State with id: "${leaf.id}" is not found`);
                }

                const StateClass = this.states.get(leaf.id);

                if (!StateClass) {
                    throw new Error(`State with id: "${leaf.id}" is not found`);
                }

                /**
                 * Get parent state if is is existed
                 */
                const parent = last(newStateStack);

                /**
                 * Create state instance and pass FSM / Parent state links
                 */
                const s = new StateClass(this, parent ? parent.state : null);

                /**
                 * Prepare a new state
                 */
                await s.onPrepare();

                /**
                 * Add to stack to run 'onUpdate' method before 'onEnter' calling 
                 */
                newStateStack.push({ state: s, order: leaf.order, running: true });

                /**
                 * Enter to a state
                 */
                await s.onEnter();
            }
        }


        this._statesStack = newStateStack;
    }

    private _makeGraph(config: IStateConfig): IGraph {

        const iter = (tree: IStateConfig, parent: string, nodeId: string, leafs = {}, path: string[] = []): IGraph => {
            if (!tree.states) {
                return {
                    ...leafs,
                    [nodeId]: {
                        id: nodeId,
                        parent,
                        transitions: tree.on || {},
                        fullPath: [...path, nodeId].join('.')
                    }
                };
            }
    
            return {
                ...leafs,
                [nodeId]: {
                    id: nodeId,
                    parent,
                    transitions: tree.on || {},
                    fullPath: [...path, nodeId].join('.'),
                    initial: tree.initial,
                    children: Object.keys(tree.states),
                },
                ...Object.entries(tree.states)
                    .reduce((acc, [key, subTree]) => ({
                        ...acc, 
                        ...iter(subTree as IStateConfig, nodeId, key, leafs, [...path, nodeId])
                    }), {})
            };
        };
        
        return iter(config, '', this._rooId);
    }

    private _exitFromStateByEvent(eventName: string) {
        const child = this._leafsStack.pop();

        if (!child) return;

        if (child.transitions.hasOwnProperty(eventName)) {
            const nextStateId = child.transitions[eventName];
            this._enterToStateById(nextStateId);
            return;
        }

        this._exitFromStateByEvent(eventName);
    }

    private _enterToStateById(stateId: string) {
        if (!this._graph.hasOwnProperty(stateId)) {
            console.error(`Such state id: "${stateId}" is not found in the graph: `, this._graph);
            throw new Error();
        }

        this._currentOrder += 1;

        this._leafsStack.push({ order: this._currentOrder, ...this._graph[stateId] });

        if (this._graph[stateId].initial) {
            this._enterToStateById(this._graph[stateId].initial);
        }
    }

    private _checkAmongAllEvent(graph: IGraph, eventName: string) {
        const result = Object.values(graph).filter(({ transitions }) => {
            if (transitions.hasOwnProperty(eventName)) return true;
            return false;
        });
        return result.length > 0;
    }

    private _checkEventInStack(eventName: string): boolean {

        const iter = (index: number, stack: IStackLeaf[]): boolean => {
            if (!stack[index]) return false;

            const child = stack[index];

            if (!child.transitions.hasOwnProperty(eventName)) {
                return iter(index -= 1, stack);
            }

            return true;
        }

        return iter(this._leafsStack.length - 1, this._leafsStack)
    }

    private _checkMachineConfig(config: IStateConfig): void | never {
        this._checkConfig(config);

        this._checkTransions(config.states || {});

        if (config.states) {

            this._checkStatesList(config.states);

            Object.values(config.states)
                .forEach((s) => this._checkMachineConfig(s as IStateConfig))
        }
    }

    private _checkStatesList(states: { [key: string]: any }): boolean | never {
        Object.keys(states).forEach((key) => {
            if (!this.states.has(key)) {
                console.error(`Such state: "${key}" is not found in states list !!!`);
                throw new Error();
            }
        });

        return true;
    }

    private _checkConfig(config: IStateConfig): boolean | never  {
        if (typeof config !== 'object') {
            console.error('Invalid config: ', config);
            throw new Error();
        }

        const hasStates = config.hasOwnProperty('states') &&
            typeof config.states === 'object';

        const hasInitial = config.hasOwnProperty('initial') &&
            typeof config.initial === 'string';

        if (hasStates && hasInitial && config.states && config.initial) {
            if (!config.states.hasOwnProperty(config.initial)) {
                console.error(`Such an initial state: "${config.initial} is not found in state config: `, config.states);
                throw new Error();
            }
            return true;
        }

        if (!hasStates && !hasInitial) {
            return true;
        }

        console.error('Invalid properties of state config: ', config);
        throw new Error();
    }

    private _checkTransions(states: { [key: string]: IStateConfig }): boolean | never {
        for (const stateName in states) {

            const { on = {} } = states[stateName];

            for (const eventName in on) {

                const transStateName = on[eventName];

                if (!states.hasOwnProperty(transStateName)) {
                    console.error(`Such state: "${transStateName}" is not exist in such list: `, states);
                    throw new Error();
                }
            }
        }
        
        return true;
    }
}