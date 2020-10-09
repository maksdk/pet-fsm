//@ts-check

import {
    FSM,
    StateNode
} from '../src/lib';

const config1 = {
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

class ThirdPlaying extends StateNode {
    get id() {
        return 'ThirdPlaying';
    }
}

class ThirdFailed extends StateNode {
    get id() {
        return 'ThirdFailed';
    }
}

test('Check', async () => {

    const states = new Map();
    states.set('First', First);
    states.set('Second', Second);
    states.set('Third', Third);
    states.set('ThirdPlaying', ThirdPlaying);
    states.set('ThirdFailed', ThirdFailed);

    const fsm = new FSM(config1, states);

    expect(fsm.getCurrentStateId()).toEqual('');

    await fsm.onStart();

    expect(fsm.getCurrentStateId()).toEqual('First');

    await fsm.onSend('COMPLETE');
    expect(fsm.getCurrentStateId()).toEqual('Second');

    await fsm.onSend('COMPLETE');
    expect(fsm.getCurrentStateId()).toEqual('Second');

    await fsm.onSend('NEXT');
    expect(fsm.getCurrentStateId()).toEqual('ThirdPlaying');

    await fsm.onSend('FAILED');
    expect(fsm.getCurrentStateId()).toEqual('ThirdFailed');

    await fsm.onSend('EXIT');
    expect(fsm.getCurrentStateId()).toEqual('Second');

    await fsm.onSend('NEXT');
    expect(fsm.getCurrentStateId()).toEqual('ThirdPlaying');

    await fsm.onSend('REPEAT');
    expect(fsm.getCurrentStateId()).toEqual('ThirdPlaying');

    await fsm.onStop();
    expect(fsm.getCurrentStateId()).toEqual('');
});


describe('Check error extensions', () => {

    it('Test 1', () => {
        const states = new Map();
        const config = {};
        // @ts-ignore
        expect(() => new FSM(config, states)).toThrow(); 
    });

    it('Test 2', () => {
        const states = new Map();
        states.set('First', First);
        states.set('Second', Second);

        expect(() => new FSM(config1, states)).toThrow(); 
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