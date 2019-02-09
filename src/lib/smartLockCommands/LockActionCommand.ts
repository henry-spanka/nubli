import { SmartLockCommand } from "./SmartLockCommand";
import { Command, LockAction } from "../states";
import { SmartLock } from "../smartLock";
import { NukiConfig } from "../nukiConfig";

export class LockActionCommand extends SmartLockCommand {
    protected _responseLength: number = 5;
    readonly requiresChallenge = true;
    private action: LockAction;

    constructor(action: LockAction) {
        super();

        this.action = action;
    }
    
    requestData(config: NukiConfig): Buffer {
        let payload: Buffer = new Buffer(6);

        payload.writeUInt8(this.action, 0);
        payload.writeUInt32LE(config.appId, 1);
        payload.writeUInt8(0, 5);

        return SmartLock.prepareCommand(Command.LOCK_ACTION, payload);
    }

    handleData(command: number, payload: Buffer): void {
        console.log(payload);
    }

}
