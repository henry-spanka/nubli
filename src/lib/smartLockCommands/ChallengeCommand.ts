import { SmartLockCommand } from "./SmartLockCommand";
import { Command } from "../states";
import { SmartLock } from "../smartLock";
import { NukiConfig } from "../nukiConfig";

export class ChallengeCommand extends SmartLockCommand {
    protected _responseLength: number = 5;
    readonly requiresChallenge = false;
    
    requestData(config: NukiConfig): Buffer {
        let identifier = new Buffer(2);
        identifier.writeUInt16LE(Command.CHALLENGE, 0);

        return SmartLock.prepareCommand(Command.REQUEST_DATA, identifier);
    }

    handleData(command: number, payload: Buffer): void {
        this._response.data.challenge = payload;

        this._complete = true;
    }

}