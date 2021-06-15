//https://stackoverflow.com/questions/44467657/jest-better-way-to-disable-console-inside-unit-tests
//this file silences console.error to prevent output clogging up tests when testing error paths in CI
//to turn them on again, just comment out the below block.

global.console = {
    log: jest.fn(), // console.log are ignored in tests

    // Keep native behaviour for other methods, use those to print out things in your own tests, not `console.log`
    error: jest.fn(),
    warn: console.warn,
    info: jest.fn(),
    debug: jest.fn(),
};
