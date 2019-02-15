import { SmartLockCommand } from "./SmartLockCommand";
import { Command, LockAction, Status } from "../states";
import { SmartLock } from "../smartLock";
import { NukiConfig } from "../nukiConfig";
import { SmartLockResponse } from "../smartLockResponse";
import { KeyTurnerStatesCommand } from "./KeyTurnerStatesCommand";

export class LockActionCommand extends SmartLockCommand {
    readonly requiresChallenge = true;
    private action: LockAction;
    private updateCallback?: (response: SmartLockResponse) => void;

    constructor(action: LockAction, updateCallback?: (response: SmartLockResponse) => void) {
        super();

        this.action = action;
        this.updateCallback = updateCallback;
    }
    
    requestData(config: NukiConfig): Buffer {
        let payload: Buffer = new Buffer(6);

        payload.writeUInt8(this.action, 0);
        payload.writeUInt32LE(config.appId, 1);
        payload.writeUInt8(0, 5);

        payload = Buffer.concat([payload, this.challenge]);

        return SmartLock.prepareCommand(Command.LOCK_ACTION, payload);
    }

    handleData(command: number, payload: Buffer): void {
        if (command == Command.STATUS) {
            let status: number = payload.readUInt8(0);

            if (status == Status.ACCEPTED) {
                // Nothing to do
            } else if (status == Status.COMPLETE) {
                this._complete = true;
            } else {
                // Should not happen
                this._complete = true;
                this._response.success = false;
            }
        } else if (command == Command.KEYTURNER_STATES) {
            let keyTurnerCommand: SmartLockCommand = new KeyTurnerStatesCommand();
            keyTurnerCommand.handleData(command, payload);

            this._response.data = keyTurnerCommand.response.data;

            if (!keyTurnerCommand.complete) {
                this._complete = true;
                this._response.success = false;
            } else if (this.updateCallback) {
                this.updateCallback(this._response);
            }
        }
    }

}
