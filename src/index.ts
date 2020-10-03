// @ts-check
import { FSM, IFSM, StateNode } from './lib';

const machineConfig = {
    id: 'funrun',
    initial: 'GamePreloadingState',
    states: {

        GamePreloadingState: {
            on: {
                LOADED: 'HomeMenuState'
            }
        },

        HomeMenuState: {
            on: {
                PLAY: 'GameplayLocalState',
            }
        },

        GameplayLocalState: {
            initial: 'PlayingPhase',

            on: {
                EXIT: 'HomeMenuState',
                PLAY: 'GameplayLocalState'
            },

            states: {

                PlayingPhase: {
                    on: {
                        PLAYER_FAILED: 'FailedPhase',
                    }
                },

                FailedPhase: {
                    on: {}
                }
            }
        }
    }
};

class BaseState extends StateNode {
    get id() {
        return 'BaseState';
    }

    public async onPrepare(): Promise<void> {
        console.log('Prepare: ', this.id)
        return new Promise((resolve) => { 
            setTimeout(resolve, 1);
        });
    }

    public async onEnter(): Promise<void> {
        console.log('Enter: ', this.id)
    }

    public async onExit(): Promise<void> {
        console.log('Exit: ', this.id)
    }
}

class GamePreloadingState extends BaseState {
    get id() {
        return 'GamePreloadingState';
    }
}

class HomeMenuState extends BaseState {
    get id() {
        return 'HomeMenuState';
    }
}

class GameplayLocalState extends BaseState {
    get id() {
        return 'GameplayLocalState';
    }
}

class PlayingPhase extends BaseState {
    get id() {
        return 'PlayingPhase';
    }
}

class FailedPhase extends BaseState {
    get id() {
        return 'FailedPhase';
    }
}


const states = new Map();
states.set('GamePreloadingState', GamePreloadingState);
states.set('HomeMenuState', HomeMenuState);
states.set('GameplayLocalState', GameplayLocalState);
states.set('PlayingPhase', PlayingPhase);
states.set('FailedPhase', FailedPhase);

class GameFSM extends FSM implements IFSM {
    private innerProp = 'innerProp';
    constructor() {
        super(machineConfig, states);
    }
}

window.FSM = GameFSM;