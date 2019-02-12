import { PeripheralFilter } from "./peripheralFilter";
import { SmartLock } from "./smartLock";

export class SmartLockPeripheralFilter implements PeripheralFilter {
    handle(peripheral: import("noble").Peripheral): boolean {
        let data: Buffer = peripheral.advertisement.manufacturerData;

        if (data.length == 25) {
            let type: number = data.readUInt8(2);
            let dataLength: number = data.readUInt8(3);
            
            // 0x02 == iBeacon
            if (type == 2 && dataLength == 21) {
                let serviceUuid: string = data.slice(4, 20).toString('hex');

                if (serviceUuid == SmartLock.NUKI_SERVICE_UUID) {
                    return true;
                }
            }
        }

        return false;
    }
}
