export interface PeripheralFilter {
    handle(peripheral: import("noble").Peripheral): boolean;
}
