import { SmartLockCommand } from "./SmartLockCommand";
import { Command } from "../states";
import { SmartLock } from "../smartLock";
import { NukiConfig } from "../nukiConfig";

export class KeyTurnerStatesCommand extends SmartLockCommand {
    protected _responseLength: number = 4;
    readonly requiresChallenge = false;
    
    requestData(config: NukiConfig): Buffer {
        let identifier = new Buffer(2);
        identifier.writeUInt16LE(Command.KEYTURNER_STATES, 0);

        return SmartLock.prepareCommand(Command.REQUEST_DATA, identifier);
    }

    handleData(command: number, payload: Buffer): void {
        this._response.data.nukiState = payload.readUInt8(0);
        this._response.data.lockState = payload.readUInt8(1);
        this._response.data.trigger = payload.readUInt8(2);

        let year: number = payload.readUInt16LE(3);
        let month: number = payload.readUInt8(5) - 1;
        let day : number= payload.readUInt8(6);
        let hour: number = payload.readUInt8(7);
        let minute: number = payload.readUInt8(8);
        let second: number = payload.readUInt8(9);
        let timeOffset: number = payload.readInt16LE(10);

        let date: Date = new Date(Date.UTC(year, month, day, hour, minute, second) + timeOffset * 1000);

        this._response.data.currentTime = date;

        this._response.data.battery_critical = payload.readUInt8(12) != 0;
        this._response.data.configUpdateCount = payload.readUInt8(13);
        this._response.data.lockNGoTimer = payload.readUInt8(14);
        this._response.data.lastLockAction = payload.readUInt8(15);
        this._response.data.lastLockActionTrigger = payload.readUInt8(16);
        this._response.data.lastLockActionCompletionStatus = payload.readUInt8(17);
        this._response.data.doorSensorState = payload.readUInt8(18);

        this._complete = true;
    }

}