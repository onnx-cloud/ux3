/**
 * IAM Test Configuration & Utilities
 * Shared setup, fixtures, and helpers for IAM tests
 */
import { StateMachine } from '../../src/fsm';
/**
 * Global test setup
 * Runs before all IAM tests
 */
export declare function setupIAMTestEnvironment(): void;
/**
 * Helper to create FSM with test configuration
 * @param machineConfig - FSM configuration object
 * @returns Fresh StateMachine instance
 */
export declare function createTestFSM<T = any>(machineConfig: any): StateMachine<T>;
/**
 * Helper to wait for FSM state change
 * @param fsm - StateMachine instance
 * @param targetState - Expected state to wait for
 * @param timeoutMs - Timeout in milliseconds (default: 1000)
 * @returns Promise resolving when state reached or rejecting on timeout
 */
export declare function waitForState(fsm: StateMachine<any>, targetState: string, timeoutMs?: number): Promise<string>;
/**
 * Helper to collect all state transitions
 * @param fsm - StateMachine instance
 * @param duration - Duration to collect transitions (ms)
 * @returns Promise resolving to array of states visited
 */
export declare function collectTransitions(fsm: StateMachine<any>, duration?: number): Promise<string[]>;
/**
 * Helper to create mock service
 * @param methods - Service method implementations
 * @returns Mock service object with vitest spy tracking
 */
export declare function createMockService(methods: Record<string, vi.Mock>): Record<string, vi.Mock>;
/**
 * Helper to assert FSM transition is valid
 * @param fsm - StateMachine instance
 * @param fromState - Source state
 * @param event - Event to send
 * @param expectedState - Expected resulting state
 */
export declare function assertTransition(fsm: StateMachine<any>, fromState: string, event: string, expectedState: string): void;
/**
 * Helper to create form with inputs
 * @param fields - Form field definitions
 * @returns HTMLFormElement with inputs
 */
export declare function createTestForm(fields: Record<string, {
    type: string;
    value: string;
}>): HTMLFormElement;
/**
 * Helper to extract form data as object
 * @param form - HTMLFormElement
 * @returns Form data as Record<string, string>
 */
export declare function getFormData(form: HTMLFormElement): Record<string, string>;
/**
 * Helper to validate email format
 * @param email - Email string to validate
 * @returns true if valid email format
 */
export declare function isValidEmail(email: string): boolean;
/**
 * Test data factories for IAM
 */
export declare const testData: {
    /**
     * Valid user credentials
     */
    validUser: {
        email: string;
        password: string;
    };
    /**
     * Invalid user credentials
     */
    invalidUser: {
        email: string;
        password: string;
    };
    /**
     * Sample user profile
     */
    userProfile: {
        id: string;
        email: string;
        name: string;
        phone: string;
    };
    /**
     * Updated user profile
     */
    updatedProfile: {
        id: string;
        email: string;
        name: string;
        phone: string;
    };
    /**
     * JWT token for testing
     */
    token: string;
    /**
     * Chat session data
     */
    chatSession: {
        sessionId: string;
        channel: string;
        userId: string;
        connected: boolean;
    };
    /**
     * Market data sample
     */
    marketData: {
        assets: {
            symbol: string;
            price: number;
            change: number;
        }[];
    };
    /**
     * Chat message
     */
    chatMessage: {
        id: string;
        text: string;
        userId: string;
        timestamp: number;
    };
    /**
     * Error responses
     */
    errors: {
        invalidCredentials: {
            error: string;
        };
        networkError: {
            error: string;
        };
        timeout: {
            error: string;
        };
        notFound: {
            error: string;
        };
    };
};
/**
 * Common test scenarios
 */
export declare const testScenarios: {
    /**
     * Successful login flow
     */
    successfulLogin: (fsm: StateMachine<any>) => Promise<{
        states: string[];
        token: string;
    }>;
    /**
     * Failed login with retry
     */
    failedLoginWithRetry: (fsm: StateMachine<any>) => Promise<string[]>;
    /**
     * Account edit and save
     */
    editAndSaveAccount: (accountFSM: StateMachine<any>, newProfile?: any) => Promise<{
        states: string[];
        profile: any;
    }>;
    /**
     * Connect and send chat message
     */
    sendChatMessage: (chatFSM: StateMachine<any>, message?: {
        id: string;
        text: string;
        userId: string;
        timestamp: number;
    }) => Promise<{
        states: string[];
        message: {
            id: string;
            text: string;
            userId: string;
            timestamp: number;
        };
    }>;
};
/**
 * Assertion helpers
 */
export declare const assertions: {
    /**
     * Assert FSM is in a valid state from its config
     */
    isValidState(fsm: StateMachine<any>, config: any): boolean;
    /**
     * Assert event can be sent from current state
     */
    canSendEvent(fsm: StateMachine<any>, event: string, config: any): boolean;
    /**
     * Assert context has expected properties
     */
    hasContextProps(fsm: StateMachine<any>, expectedProps: string[]): boolean;
    /**
     * Assert context property has expected value
     */
    contextHasValue(fsm: StateMachine<any>, prop: string, value: any): boolean;
};
/**
 * Event simulation helpers
 */
export declare const eventHelpers: {
    /**
     * Simulate form submission
     */
    submitForm(form: HTMLFormElement, event?: string): Record<string, string>;
    /**
     * Simulate button click
     */
    clickButton(button: HTMLButtonElement, event?: string): {
        button: HTMLButtonElement;
        event: string | undefined;
    };
    /**
     * Simulate input change
     */
    changeInput(input: HTMLInputElement, value: string): {
        element: HTMLInputElement;
        value: string;
    };
};
declare const _default: {
    setupIAMTestEnvironment: typeof setupIAMTestEnvironment;
    createTestFSM: typeof createTestFSM;
    waitForState: typeof waitForState;
    collectTransitions: typeof collectTransitions;
    createMockService: typeof createMockService;
    assertTransition: typeof assertTransition;
    createTestForm: typeof createTestForm;
    getFormData: typeof getFormData;
    isValidEmail: typeof isValidEmail;
    testData: {
        /**
         * Valid user credentials
         */
        validUser: {
            email: string;
            password: string;
        };
        /**
         * Invalid user credentials
         */
        invalidUser: {
            email: string;
            password: string;
        };
        /**
         * Sample user profile
         */
        userProfile: {
            id: string;
            email: string;
            name: string;
            phone: string;
        };
        /**
         * Updated user profile
         */
        updatedProfile: {
            id: string;
            email: string;
            name: string;
            phone: string;
        };
        /**
         * JWT token for testing
         */
        token: string;
        /**
         * Chat session data
         */
        chatSession: {
            sessionId: string;
            channel: string;
            userId: string;
            connected: boolean;
        };
        /**
         * Market data sample
         */
        marketData: {
            assets: {
                symbol: string;
                price: number;
                change: number;
            }[];
        };
        /**
         * Chat message
         */
        chatMessage: {
            id: string;
            text: string;
            userId: string;
            timestamp: number;
        };
        /**
         * Error responses
         */
        errors: {
            invalidCredentials: {
                error: string;
            };
            networkError: {
                error: string;
            };
            timeout: {
                error: string;
            };
            notFound: {
                error: string;
            };
        };
    };
    testScenarios: {
        /**
         * Successful login flow
         */
        successfulLogin: (fsm: StateMachine<any>) => Promise<{
            states: string[];
            token: string;
        }>;
        /**
         * Failed login with retry
         */
        failedLoginWithRetry: (fsm: StateMachine<any>) => Promise<string[]>;
        /**
         * Account edit and save
         */
        editAndSaveAccount: (accountFSM: StateMachine<any>, newProfile?: any) => Promise<{
            states: string[];
            profile: any;
        }>;
        /**
         * Connect and send chat message
         */
        sendChatMessage: (chatFSM: StateMachine<any>, message?: {
            id: string;
            text: string;
            userId: string;
            timestamp: number;
        }) => Promise<{
            states: string[];
            message: {
                id: string;
                text: string;
                userId: string;
                timestamp: number;
            };
        }>;
    };
    assertions: {
        /**
         * Assert FSM is in a valid state from its config
         */
        isValidState(fsm: StateMachine<any>, config: any): boolean;
        /**
         * Assert event can be sent from current state
         */
        canSendEvent(fsm: StateMachine<any>, event: string, config: any): boolean;
        /**
         * Assert context has expected properties
         */
        hasContextProps(fsm: StateMachine<any>, expectedProps: string[]): boolean;
        /**
         * Assert context property has expected value
         */
        contextHasValue(fsm: StateMachine<any>, prop: string, value: any): boolean;
    };
    eventHelpers: {
        /**
         * Simulate form submission
         */
        submitForm(form: HTMLFormElement, event?: string): Record<string, string>;
        /**
         * Simulate button click
         */
        clickButton(button: HTMLButtonElement, event?: string): {
            button: HTMLButtonElement;
            event: string | undefined;
        };
        /**
         * Simulate input change
         */
        changeInput(input: HTMLInputElement, value: string): {
            element: HTMLInputElement;
            value: string;
        };
    };
};
export default _default;
//# sourceMappingURL=test-utils.d.ts.map