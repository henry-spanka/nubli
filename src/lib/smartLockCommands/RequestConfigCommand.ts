import { SmartLockCommand } from "./SmartLockCommand";
import { Command } from "../states";
import { SmartLock } from "../smartLock";
import { NukiConfig } from "../nukiConfig";

export class RequestConfigCommand extends SmartLockCommand {
    readonly requiresChallenge = true;
    
    requestData(config: NukiConfig): Buffer {
        return SmartLock.prepareCommand(Command.REQUEST_CONFIG, this.challenge);
    }

    handleData(command: number, payload: Buffer): void {
        this._response.data.nukiId = payload.readUInt32LE(0);
        this._response.data.name = payload.slice(4, 36).toString('utf8').replace(/\0/g, '');
        this._response.data.latitude = payload.readFloatLE(36);
        this._response.data.longitude = payload.readFloatLE(40);
        this._response.data.autoUnlatch = payload.readUInt8(44) == 1;
        this._response.data.pairingEnabled = payload.readUInt8(45) == 1;
        this._response.data.buttonEnabled = payload.readUInt8(46) == 1;
        this._response.data.ledEnabled = payload.readUInt8(47) == 1;
        this._response.data.ledBrightness = payload.readUInt8(48);
        
        let year: number = payload.readUInt16LE(49);
        let month: number = payload.readUInt8(51) - 1;
        let day : number= payload.readUInt8(52);
        let hour: number = payload.readUInt8(53);
        let minute: number = payload.readUInt8(54);
        let second: number = payload.readUInt8(55);
        let timeOffset: number = payload.readInt16LE(56);


        let date: Date = new Date(Date.UTC(year, month, day, hour, minute, second) + timeOffset * 1000);

        this._response.data.currentTime = date;

        this._response.data.dstMode = payload.readUInt8(58);
        this._response.data.hasFob = payload.readUInt8(59) == 1;
        this._response.data.fobAction1 = payload.readUInt8(60);
        this._response.data.fobAction2 = payload.readUInt8(61);
        this._response.data.fobAction3 = payload.readUInt8(62);
        this._response.data.singleLock = payload.readUInt8(63) == 1;
        this._response.data.advertisingMode = payload.readUInt8(64);
        this._response.data.hasKeyPad = payload.readUInt8(65) == 1;

        let majorVersion: number = payload.readUInt8(66);
        let minorVersion: number = payload.readUInt8(67);
        let patchVersion: number = payload.readUInt8(68);
        this._response.data.firmwareVersion = majorVersion + "." + minorVersion + "." + patchVersion;
        
        let hardwareMajorVersion: number = payload.readUInt8(69);
        let hardwareMinorVersion: number = payload.readUInt8(70);
        this._response.data.hardwareRevision = hardwareMajorVersion + "." + hardwareMinorVersion;

        this._response.data.homeKitStatus = payload.readUInt8(71);
        this._response.data.timeZoneId = payload.readUInt16LE(72);

        this._complete = true;
    }

}
