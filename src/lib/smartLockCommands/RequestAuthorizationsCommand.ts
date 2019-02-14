import { SmartLockCommand } from "./SmartLockCommand";
import { Command } from "../states";
import { SmartLock } from "../smartLock";

export class RequestAuthorizationsCommand extends SmartLockCommand {
    readonly requiresChallenge = true;
    private pin: number;
    private offset: number;
    private count: number;

    constructor(pin: number, offset: number = 0, count: number = 10) {
        super();

        this.pin = pin;
        this.offset = offset;
        this.count = count;

        this._response.data = {
            count: null,
            authorizations: []
        };
    }
    
    requestData(): Buffer {
        let payload: Buffer = new Buffer(4);

        payload.writeUInt16LE(this.offset, 0);
        payload.writeUInt16LE(this.count, 2);

        let pinBuf: Buffer = new Buffer(2);
        pinBuf.writeUInt16LE(this.pin, 0);

        payload = Buffer.concat([payload, this.challenge, pinBuf]);

        return SmartLock.prepareCommand(Command.REQUEST_AUTHORIZATION_ENTRIES, payload);
    }

    handleData(command: number, payload: Buffer): void {
        if (command == Command.AUTHORIZATION_ENTRY_COUNT) {
            this._response.data.count = payload.readUInt16LE(0);

            if (this._response.data.count == 0) {
                this._complete = true;
            }
        } else if (command == Command.AUTHORIZATION_ENTRY) {
            let entry: any = {};

            entry.authorizationId = payload.readUInt32LE(0);
            entry.idType = payload.readUInt8(4);
            entry.name = payload.slice(5, 37).toString('utf8').replace(/\0/g, '');
            entry.enabled = payload.readUInt8(37) == 1;
            entry.remoteAllowed = payload.readUInt8(38) == 1;
            

            let year: number = payload.readUInt16LE(39);
            let month: number = payload.readUInt8(41) - 1;
            let day : number= payload.readUInt8(42);
            let hour: number = payload.readUInt8(43);
            let minute: number = payload.readUInt8(44);
            let second: number = payload.readUInt8(45);
    
            entry.dateCreated = new Date(year, month, day, hour, minute, second);

            year = payload.readUInt16LE(46);
            month = payload.readUInt8(48) - 1;
            day = payload.readUInt8(49);
            hour = payload.readUInt8(50);
            minute  = payload.readUInt8(51);
            second = payload.readUInt8(52);

            entry.dateLastActive = new Date(year, month, day, hour, minute, second);

            entry.lockCount = payload.readUInt16LE(53);
            entry.timeLimited = payload.readUInt8(55) == 1;

            entry.allowedFromDate = null;
            entry.allowedUntilDate = null;
            entry.allowedWeekdays = null;
            entry.allowedFromTime = null;
            entry.allowedUntilTime = null;
            
            if (entry.timeLimited) {
                year = payload.readUInt16LE(56);
                month = payload.readUInt8(58) - 1;
                day = payload.readUInt8(59);
                hour = payload.readUInt8(60);
                minute  = payload.readUInt8(61);
                second = payload.readUInt8(62);
    
                entry.allowedFromDate = new Date(year, month, day, hour, minute, second);

                year = payload.readUInt16LE(63);
                month = payload.readUInt8(65) - 1;
                day = payload.readUInt8(66);
                hour = payload.readUInt8(67);
                minute  = payload.readUInt8(68);
                second = payload.readUInt8(69);
    
                entry.allowedUntilDate = new Date(year, month, day, hour, minute, second);

                let allowedWeekdays: number = payload.readUInt8(70);

                if (allowedWeekdays > 0) {
                    entry.allowedWeekdays = [];

                    if (allowedWeekdays & 0x40) entry.allowedWeekdays.push("Monday");
                    if (allowedWeekdays & 0x20) entry.allowedWeekdays.push("Tuesday");
                    if (allowedWeekdays & 0x10) entry.allowedWeekdays.push("Wednesday");
                    if (allowedWeekdays & 0x08) entry.allowedWeekdays.push("Thursday");
                    if (allowedWeekdays & 0x04) entry.allowedWeekdays.push("Friday");
                    if (allowedWeekdays & 0x02) entry.allowedWeekdays.push("Saturday");
                    if (allowedWeekdays & 0x01) entry.allowedWeekdays.push("Sunday");
                }

                hour = payload.readUInt8(71);
                minute  = payload.readUInt8(72);

                entry.allowedFromTime = hour + ":" + minute;
    
                hour = payload.readUInt8(73);
                minute  = payload.readUInt8(74);

                entry.allowedUntilTime = hour + ":" + minute;
            }

            this._response.data.authorizations.push(entry);
        } else if (command == Command.STATUS) {
            let status: number = payload.readUInt8(0);

            if (status == 0 && this._response.data.authorizations.length == this._response.data.count) {
                this._complete = true;
            } else {
                this._complete = true;
                this.response.success = false;
            }
        }
    }

}
