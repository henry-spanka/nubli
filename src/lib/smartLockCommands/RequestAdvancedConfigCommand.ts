import { SmartLockCommand } from "./SmartLockCommand";
import { Command } from "../states";
import { SmartLock } from "../smartLock";
import { NukiConfig } from "../nukiConfig";

export class RequestAdvancedConfigCommand extends SmartLockCommand {
    readonly requiresChallenge = true ;
    
    requestData(config: NukiConfig): Buffer {
        return SmartLock.prepareCommand(Command.REQUEST_ADVANCED_CONFIG);
    }

    handleData(command: number, payload: Buffer): void {
        this._response.data.totalDegrees = payload.readUInt16LE(0);
        this._response.data.unlockedPositionOffsetDegrees = payload.readInt16LE(2);
        this._response.data.lockedPositionOffsetDegrees = payload.readInt16LE(4);
        this._response.data.singleLockedPositionOffsetDegrees = payload.readInt16LE(6);
        this._response.data.unlockedToLockedTransitionOffsetDegrees = payload.readInt16LE(8);
        this._response.data.lockNGoTimeout = payload.readUInt8(10);
        this._response.data.singleButtonPressAction = payload.readUInt8(11);
        this._response.data.doubleButtonPressAction = payload.readUInt8(12);
        this._response.data.detachedCylinder = payload.readUInt8(13) == 1;
        this._response.data.batteryType = payload.readUInt8(14);
        this._response.data.automaticBatteryTypeDetection = payload.readUInt8(15) == 1;
        this._response.data.unlatchDuration = payload.readUInt8(16);
        this._response.data.autoLockTimeout = payload.readUInt16LE(17);

        this._complete = true;
    }

}
