import { SmartLockResponse } from "../smartLockResponse";
import { NukiConfig } from "../nukiConfig";

export abstract class SmartLockCommand {
    protected _callback?: (response: SmartLockResponse) => void;
    protected _response: SmartLockResponse;
    protected _complete: boolean = false;
    abstract readonly requiresChallenge: boolean;

    abstract requestData(config: NukiConfig): Buffer;
    abstract handleData(command: number, payload: Buffer): void;

    constructor() {
        this._response = new SmartLockResponse();
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
}
