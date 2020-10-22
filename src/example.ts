import { FSM, StateNode } from './index';

const config = {
    id: 'machine',
    initial: 'Intro',
    states: {
        Intro: {
            on: {
                PLAY: 'Gameplay'
            }
        },
        Gameplay: {
            initial: 'Playing',
            on: {
                EXIT: 'Intro',
            },
            states: {
                Playing: {
                    on: {
                        FAILED: 'Failed'
                    }
                },
                Failed: {
                    on: {
                        REPLAY: 'Gameplay'
                    }
                }
            }
        }
    }
};

// CREATE MACHINE
class Machine extends FSM {
    constructor() {
        super(config, Machine.states);
    }

    private static get states() {
        const map = new Map();
        map.set('Intro', Intro);
        map.set('Gameplay', Gameplay);
        map.set('Playing', Playing);
        map.set('Failed', Failed);
        return map;
    }
}


// CREATE STATE
class Intro extends StateNode {
    public id = 'Intro';
    protected parent!: null;

    constructor(fsm: Machine, parent: StateNode | null) {
        super(fsm, parent);
    }

    public async onEnter() {
        // init some here
    }

    public async onExit() {
        // off all events or something yet
    }
}


// CREATE STATE
class Gameplay extends StateNode {
    public id = 'Gameplay';
    protected parent!: null;
    private props = {
        playerName: 'Kenny'
    };

    constructor(fsm: Machine, parent: StateNode | null) {
        super(fsm, parent);
    }

    public async onEnter() {
        // init some here
    }

    public async onExit() {
        // off all events or something yet
    }

    public getProps() {
        return this.props;
    }
}


// CREATE STATE
class Playing extends StateNode {
    public id = 'Playing';
    protected parent!: Gameplay;

    constructor(fsm: Machine, parent: Gameplay) {
        super(fsm, parent);
    }

    public async onEnter() {
        // init some here

        // get some props from parent - Gameplay
        const props = this.parent.getProps();
        console.log('Gameplay props: ', props);
    }

    public async onExit() {
        // off all events or something yet
    }

    private onFail() {
        // transfer to Failed state
        this.fsm.onSend('FAILED');
    }
}


// CREATE STATE
class Failed extends StateNode {
    public id = 'Failed';
    protected parent!: Gameplay;

    constructor(fsm: Machine, parent: Gameplay) {
        super(fsm, parent);
    }

    public async onEnter() {
        // init some here

        // get some props from parent - Gameplay
        const props = this.parent.getProps();
        console.log('Gameplay props: ', props);
    }

    public async onExit() {
        // off all events or something yet
    }

    private onReplay() {
        // transfer to Gameplay state - replay game
        this.fsm.onSend('REPLAY');
    }
}