import { SmartLockResponse } from "../smartLockResponse";
import { NukiConfig } from "../nukiConfig";

export abstract class SmartLockCommand {
    private _challenge: Buffer | null = null;
    protected _callback?: (response: SmartLockResponse) => void;
    protected _response: SmartLockResponse;
    protected _complete: boolean = false;
    abstract readonly requiresChallenge: boolean;

    abstract requestData(config: NukiConfig): Buffer;
    abstract handleData(command: number, payload: Buffer): void;

    constructor() {
        this._response = new SmartLockResponse();
    }

    set challenge(challenge: Buffer) {
        this._challenge = challenge;
    }

    get challenge(): Buffer {
        if (!this._challenge) {
            throw new Error("Challenge is null.");
        }
        return this._challenge;
    }

    get complete(): boolean {
        return this._complete;
    }

    get response(): SmartLockResponse {
        return this._response;
    }

    set callback(callback: (response: SmartLockResponse) => void) {
        this._callback = callback;
    }

    sendResponse(): void {
        if (this._callback) {
            this._callback(this._response);
            this._callback = undefined;
        }
    }

    sendFailure(errorMessage?: string): void {
        this._response.success = false;
        
        if (errorMessage !== undefined && errorMessage !== null) {
            this._response.message = errorMessage;
        }

        this.sendResponse();
    }
}
