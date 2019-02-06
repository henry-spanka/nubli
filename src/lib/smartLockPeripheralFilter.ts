import { PeripheralFilter } from "./peripheralFilter";

export class SmartLockPeripheralFilter implements PeripheralFilter {
    handle(peripheral: import("noble").Peripheral): boolean {
        let name: string = peripheral.advertisement.localName;

        return name !== undefined && peripheral.advertisement.localName.slice(0, 3) == "Nuk";
    }
}
