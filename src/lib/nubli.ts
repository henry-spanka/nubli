import Noble from "noble";
import { PeripheralFilter } from "./peripheralFilter";
import { SmartLockPeripheralFilter } from "./smartLockPeripheralFilter";
import { SmartLock } from "./smartLock";
import Events from 'events';

export class Nubli extends Events.EventEmitter {
    private noble: typeof Noble = Noble;
    private debugEnabled: boolean = false;
    private peripheralFilter: PeripheralFilter;
    private _smartlocks: Array<SmartLock> = [];
    private _configPath: string = "./config/";

    constructor(peripheralFilter: PeripheralFilter = new SmartLockPeripheralFilter(), configPath?: string) {
        super();

        this.peripheralFilter = peripheralFilter;

        if (configPath) {
            this._configPath = configPath;
        }

        this.noble.on('discover', (peripheral: Noble.Peripheral) => this.peripheralDiscovered(peripheral));
        this.noble.on('stateChange', (state: string) => this.stateChange(state));
    }

    setDebug(debugEnabled: boolean) {
        this.debugEnabled = debugEnabled;
    }

    private peripheralDiscovered(peripheral: Noble.Peripheral): void {
        if (!this.peripheralFilter.handle(peripheral)) {
            this.debug("Peripheral did not matched filter: " + peripheral.id + " - " + peripheral.advertisement.localName);
            return;
        }

        this.debug("Peripheral matched filter: " + peripheral.id + " - " + peripheral.advertisement.localName);

        let smartLock: SmartLock = new SmartLock(this, peripheral);

        this.emit("smartLockDiscovered", smartLock);

        this._smartlocks.push(smartLock);
    }

    get smartlocks(): Array<SmartLock> {
        return this._smartlocks;
    }

    private stateChange(state: string): void {
        this.debug("state change: " + state);
        this.emit("state", state);

        if (state == "poweredOn") {
            this.emit("readyToScan");
        }
    }

    debug(message: string) {
        if (this.debugEnabled) {
            console.log(message);
        }
    }

    readyToScan(): boolean {
        return this.noble.state == "poweredOn";
    }

    async onReadyToScan(timeout: number = 10): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.readyToScan()) {
                resolve();
            } else {
                this.once('readyToScan', () => {
                    resolve();
                });
            }

            setTimeout(() => {
                reject('Adapter still not ready after ' + timeout + " seconds");
            }, timeout * 1000)
        });
    }

    startScanning(): void {
        if (!this.readyToScan()) {
            throw new Error("Scanning only possible if the adapter is ready.");
        }

        this.noble.startScanning();

        this.emit("startedScanning");
        this.debug("Started scanning");
    }

    stopScanning(): void {
        this.noble.stopScanning();

        this.emit("stoppedScanning");
        this.debug("Stopped scanning");
    }

    get configPath(): string {
        return this._configPath;
    }
}
