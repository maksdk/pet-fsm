//@ts-check

import { FSM, StateNode } from '../src/bin';

class First extends StateNode {
    get id() {
        return 'First';
    }
}

class Second extends StateNode {
    get id() {
        return 'Second';
    }
}

class Third extends StateNode {
    get id() {
        return 'Third';
    }
}

class Preloading extends StateNode {
    get id() {
        return 'Preloading';
    }
}

class Gameplay extends StateNode {
    get id() {
        return 'Gameplay';
    }
}

class Complete extends StateNode {
    get id() {
        return 'Complete';
    }
}

class Playing extends StateNode {
    get id() {
        return 'Playing';
    }
}

class Failed extends StateNode {
    get id() {
        return 'Failed';
    }
}

const awaiter = async (delay) => await new Promise((r) => setTimeout(r, delay));

jest.setTimeout(20000);

describe('FSM transactions', () => {

    it('Test sequence', async () => {
        const states = new Map();
        states.set('First', First);
        states.set('Second', Second);

        const config = {
            id: 'machine',
            initial: 'First',
            states: {

                First: {
                    on: {
                        GO_TO_SECOND: 'Second'
                    }
                },

                Second: {
                    on: {
                        GO_TO_FIRST: 'First'
                    }
                }
            }
        };


        const fsm = new FSM(config, states);

        await fsm.onStart();
    
        /**
         * Check the first state
         */
        const first = fsm.getCurrentState();
    
        expect(first.id).toEqual('First');
    
        first.onExit = async () => {
            await awaiter(500);
            expect(fsm.getCurrentState().id).toEqual('First');
        };
    

        /**
         * Go to the second state
         */
        fsm.onSend('GO_TO_SECOND');
    
        await awaiter(1000);
        const second = fsm.getCurrentState();
        expect(second.id).toEqual('Second');

        fsm.onSend('GO_TO_SECOND');
        expect(second.id).toEqual('Second');


        /**
         * Return to the first
         */
        second.onExit = async () => {
            await awaiter(500);
            expect(fsm.getCurrentState().id).toEqual('Second');
        };
    
        fsm.onSend('GO_TO_FIRST');
    
        await awaiter(1000);

        expect(fsm.getCurrentState().id).toEqual('First');

        fsm.onSend('GO_TO_FIRST');

        expect(fsm.getCurrentState().id).toEqual('First');
    });

    it('Test of hierarchical depth', async () => {
        const config = {
            id: 'machine',

            initial: 'Preloading',

            states: {
        
                Preloading: {
                    on: {
                        LOADED: 'Gameplay'
                    }
                },
        
                Gameplay: {
                    initial: 'Playing',
        
                    on: {
                        EXIT: 'Complete',
                        REPEAT: 'Gameplay'
                    },
        
                    states: {
        
                        Playing: {
                            on: {
                                FAILED: 'Failed',
                            }
                        },
        
                        Failed: {}
                    }
                },
        
                Complete: {}
            }
        };

        const states = new Map();
        states.set('Preloading', Preloading);
        states.set('Gameplay', Gameplay);
        states.set('Complete', Complete);
        states.set('Playing', Playing);
        states.set('Failed', Failed);

        const fsm = new FSM(config, states);
        await fsm.onStart();

        expect(fsm.getCurrentState().id).toEqual('Preloading');

        fsm.onSend('LOADED');

        await awaiter(50);

        expect(fsm.getCurrentState().id).toEqual('Playing');

        const playing = fsm.getCurrentState();

        playing.onExit = async () => {
            await awaiter(500);
            expect(fsm.getCurrentState()).toEqual(playing);
        };

        fsm.onSend('FAILED');

        await awaiter(100);
        expect(fsm.getCurrentState().id).toEqual('Playing');

        await awaiter(500);
        expect(fsm.getCurrentState().id).toEqual('Failed');


        fsm.onSend('REPEAT');
        await awaiter(200);
        expect(fsm.getCurrentState().id).toEqual('Playing');


        fsm.onSend('EXIT');
        await awaiter(200);
        expect(fsm.getCurrentState().id).toEqual('Complete');
    });
});


describe('Check error exceptions', () => {

    it('Test 1', () => {
        const states = new Map();
        const config = {};
        // @ts-ignore
        expect(() => new FSM(config, states)).toThrow(); 
    });

    it('Test 2', () => {
        const config = {
            id: 'machine1',
            initial: 'First',
            states: {

                First: {
                    on: {
                        COMPLETE: 'Second'
                    }
                },

                Second: {
                    on: {
                        NEXT: 'Third',
                    }
                },

                Third: {
                    initial: 'ThirdPlaying',

                    on: {
                        EXIT: 'Second',
                        REPEAT: 'Third'
                    },

                    states: {

                        ThirdPlaying: {
                            on: {
                                FAILED: 'ThirdFailed',
                            }
                        },

                        ThirdFailed: {}
                    }
                }
            }
        };

        const states = new Map();
        states.set('First', First);
        states.set('Second', Second);

        expect(() => new FSM(config, states)).toThrow(); 
    });
    
    it('Test 3', () => {
        const states = new Map();
        states.set('First', First);
        states.set('Second', Second);
        states.set('Third', Third);

        const config = {
            id: 'machine',
            initial: 'First',
            states: {

                First: {
                    on: {
                        COMPLETE: 'Second'
                    }
                },

                Second: {
                    on: {
                        NEXT: 'Third',
                    }
                }
            }
        };

        expect(() => new FSM(config, states)).toThrow(); 
    });

    it('Test 4', () => {
        const states = new Map();
        states.set('First', First);
        states.set('Second', Second);

        const config = {
            id: 'machine',
            states: {

                First: {
                    on: {
                        COMPLETE: 'Second'
                    }
                },

                Second: {}
            }
        };

        // @ts-ignore
        expect(() => new FSM(config, states)).toThrow(); 
    });
});