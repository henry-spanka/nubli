import Events from "events";
import { Nubli } from "./nubli";
import { SmartLockPairer } from "./smartLockPairer";
import { NukiConfig } from "./nukiConfig";
import { crc16ccitt } from "crc";
import { Command, GeneralState, GeneralError, LockAction } from "./states";
import sodium from "libsodium-wrappers";
import { ErrorHandler } from "./errorHandler";
import { SmartLockCommand } from "./smartLockCommands/SmartLockCommand";
import { SmartLockResponse } from "./smartLockResponse";
import { KeyTurnerStatesCommand } from "./smartLockCommands/KeyTurnerStatesCommand";
import { LockActionCommand } from "./smartLockCommands/LockActionCommand";
import { ChallengeCommand } from "./smartLockCommands/ChallengeCommand";
import { RequestConfigCommand } from "./smartLockCommands/RequestConfigCommand";
import { RequestAdvancedConfigCommand } from "./smartLockCommands/RequestAdvancedConfigCommand";

export class SmartLock extends Events.EventEmitter {
    static readonly NUKI_SERVICE_UUID = "a92ee200550111e4916c0800200c9a66";
    static readonly NUKI_PAIRING_SERVICE_UUID = "a92ee100550111e4916c0800200c9a66";
    static readonly NUKI_PAIRING_GENERAL_DATA_IO_CHARACTERISTIC_UUID = "a92ee101550111e4916c0800200c9a66";
    static readonly NUKI_SERVICE_GENERAL_DATA_IO_CHARACTERISTIC_UUID = "a92ee201550111e4916c0800200c9a66";
    static readonly NUKI_USER_SPECIFIC_DATA_IO_CHARACTERISTIC_UUID = "a92ee202550111e4916c0800200c9a66";

    private nubli: Nubli;
    private device: import("noble").Peripheral;
    private nukiPairingCharacteristic: import("noble").Characteristic | null
    private nukiServiceCharacteristic: import("noble").Characteristic | null
    private nukiUserCharacteristic: import("noble").Characteristic | null;
    private config: NukiConfig | null = null;
    private state: GeneralState = GeneralState.IDLE;
    private partialPayload: Buffer = new Buffer(0);
    private currentCommand: SmartLockCommand | null = null;
    private stateChanged: boolean = false;
    private shouldBeConnected: boolean = false;
    private lastManufacturerDataReceived: Date = new Date();
    private _stale: boolean = false;

    constructor(nubli: Nubli, device: import("noble").Peripheral) {
        super();

        this.nubli = nubli;
        this.device = device;

        this.nukiPairingCharacteristic = null;
        this.nukiServiceCharacteristic = null;
        this.nukiUserCharacteristic = null;

        this.device.on("disconnect", async () => {
            this.debug("disconnected");
            this.emit("disconnected");

            this.nukiPairingCharacteristic = null;
            this.nukiServiceCharacteristic = null;
            this.nukiUserCharacteristic = null;

            // Try to reconnect when we're not done yet
            if (this.shouldBeConnected && !this.isConnected()) {
                this.debug("Unexpected disconnect. Trying to reconnect.");
                await this.connect();
            }
        });

        // Check if the Smart Lock is stale
        setInterval(() => {
            if (!this._stale && (new Date().getTime() - this.lastManufacturerDataReceived.getTime()) / 1000 > 30) {
                this.debug("No Advertisement received from Smart Lock within 30 seconds - Marking Smart Lock as stale.");
                this._stale = true;
                this.emit("stale");
            }
        }, 60 * 1000);
    }

    updateManufacturerData(data: Buffer): void {
        // See: https://developer.nuki.io/t/bluetooth-specification-questions/1109/3
        if (data.length == 25) {
            let type: number = data.readUInt8(2);
            let dataLength: number = data.readUInt8(3);
            
            // 0x02 == iBeacon
            if (type == 2 && dataLength == 21) {
                let serviceUuid: string = data.slice(4, 20).toString('hex');
                
                if (serviceUuid == SmartLock.NUKI_SERVICE_UUID) {
                    let smartLockId: string = data.slice(20, 24).toString('hex').toUpperCase();
                    let rssi: number = data.readInt8(24);

                    this.debug(rssi);
                    this.lastManufacturerDataReceived = new Date();

                    if (this._stale) {
                        this._stale = false;

                        this.debug("Received advertisements again - Marking Smart Lock as recovered.");
                        this.emit("staleRecovered");
                    }

                    // Smart Lock sets rssi to -59 if an entry to the activity log has been added.
                    // Once the bridge has read the new state the rssi value will be set back to -60.
                    if (rssi == -59 && !this.stateChanged) {
                        this.stateChanged = true;
                        this.emit("activityLogChanged");
                    } else {
                        this.stateChanged = false;
                    }
                }
            }
        }
    }

    async connect(): Promise<void> {
        this.shouldBeConnected = true;

        return new Promise<void>((resolve, reject) => {
            if (!this.device.connectable) {
                reject("Device is not connectable.");
            } else {
                if (this.isConnected()) {
                    resolve();
                    return;
                }

                this.device.connect(async (error?: string) => {
                    if (error) {
                        reject(error);
                    } else {
                        await this.discoverServicesAndCharacteristics();
                        await this.populateCharacteristics();

                        await this.setupUSDIOListener();

                        this.debug("connected");
                        this.emit("connected");

                        resolve();
                    }
                });
            }
        });
    }

    async disconnect(): Promise<void> {
        this.shouldBeConnected = false;

        return new Promise<void>(async (resolve, reject) => {
            await this.removeUSDIOListener();

            this.device.disconnect(async (error?: string) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    isConnected(): boolean {
        return this.device.state == "connected";
    }

    configExists(path?: string): boolean {
        if (path === undefined) {
            path = this.nubli.configPath;
        }

        return NukiConfig.configExists(this.device.uuid, path);
    }

    async readConfig(path?: string): Promise<void> {
        if (path === undefined) {
            path = this.nubli.configPath;
        }

        this.config = await NukiConfig.readConfig(this.device.uuid, path);
    }

    async saveConfig(path?: string): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            if (path === undefined) {
                path = this.nubli.configPath;
            }
            
            if (!this.config) {
                reject();
            } else {
                await this.config.save(path);
                resolve();
            }
        });
    }

    async pair(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            if (!this.isConnected()) {
                reject("Device is not connected");
                return;
            }

            if (this.paired) {
                resolve();
                return;
            }

            this.validateCharacteristics();

            this.debug("All characteristics found. Trying to pair");

            let nukiConfig: NukiConfig;

            try {
                await NukiConfig.configExists(this.device.uuid, this.nubli.configPath);
                nukiConfig = await NukiConfig.readConfig(this.device.uuid, this.nubli.configPath);
            } catch (err) {
                nukiConfig = new NukiConfig(this.device.uuid, false);
            }

            let pairer: SmartLockPairer = new SmartLockPairer(this.nukiPairingCharacteristic!, nukiConfig);
            pairer.pair()
                .then((nukiConfig: NukiConfig) => {
                    this.config = nukiConfig;
                    resolve();
                })
                .catch((error) => {
                    this.debug(error);
                    reject(error);
                });
        });
    }

    private async discoverServicesAndCharacteristics(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.device.discoverSomeServicesAndCharacteristics(
                [SmartLock.NUKI_SERVICE_UUID, SmartLock.NUKI_PAIRING_SERVICE_UUID],
                [],
                (error: string, services: import("noble").Service[]) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
        });
    }

    private populateCharacteristics(): void {
        for (let service of this.device.services) {
            for (let characteristic of service.characteristics) {
                switch (characteristic.uuid) {
                    case SmartLock.NUKI_PAIRING_GENERAL_DATA_IO_CHARACTERISTIC_UUID:
                        this.nukiPairingCharacteristic = characteristic;
                        break;
                    case SmartLock.NUKI_SERVICE_GENERAL_DATA_IO_CHARACTERISTIC_UUID:
                        this.nukiServiceCharacteristic = characteristic;
                        break;
                    case SmartLock.NUKI_USER_SPECIFIC_DATA_IO_CHARACTERISTIC_UUID:
                        this.nukiUserCharacteristic = characteristic;
                        break;
                }
            }
        }
    }

    private validateCharacteristics(): void {
        if (!this.nukiPairingCharacteristic || !this.nukiServiceCharacteristic || !this.nukiUserCharacteristic) {
            throw new Error("The device is not a Smart Lock.");
        }
    }

    static appendCRC(data: Buffer): Buffer {
        let crc: number = crc16ccitt(data);

        let crcBuf = new Buffer(2);
        crcBuf.writeUInt16LE(crc, 0);

        return Buffer.concat([data, crcBuf]);
    }

    static verifyCRC(data: Buffer): boolean {
        let crc: number = data.readUInt16LE(data.length - 2);

        return crc == crc16ccitt(data.slice(0, data.length - 2));
    }

    private validateCRC(data: Buffer): boolean {
        if (!SmartLock.verifyCRC(data)) {
            let errorMessage = ErrorHandler.errorToMessage(GeneralError.BAD_CRC);

            this.emit("error", errorMessage);
            
            return false;
        }

        return true;
    }

    get paired(): boolean {
        if (this.config == null) {
            return false;
        }

        return this.config.paired;
    }

    async executeCommand(command: SmartLockCommand): Promise<SmartLockResponse> {
        this.debug("Executing command");

        return new Promise<SmartLockResponse>(async (resolve, reject) => {
            if (!this.isConnected()) {
                await this.connect();
            }

            this.validateCharacteristics();

            let challenge: Buffer | undefined;

            if (command.requiresChallenge) {
                this.currentCommand = new ChallengeCommand();
                await this.writeEncryptedData(this.currentCommand.requestData(this.config!));
                let response: SmartLockResponse = await this.waitForResponse();
                
                challenge = response.data.challenge;
            }

            this.currentCommand = command;
            await this.writeEncryptedData(this.currentCommand.requestData(this.config!), challenge);

            let response: SmartLockResponse = await this.waitForResponse();
            this.state = GeneralState.IDLE;
    
            resolve(response);
        });
    }

    async waitForResponse(): Promise<SmartLockResponse> {
        return new Promise<SmartLockResponse>(async (resolve, reject) => {
            this.currentCommand!.callback = (response: SmartLockResponse) => {
                resolve(response);
            };
        });
    }

    async requestConfig(): Promise<SmartLockResponse> {
        this.debug("Reading configuration");

        return await this.executeCommand(new RequestConfigCommand());
    }

    async requestAdvancedConfig(): Promise<SmartLockResponse> {
        this.debug("Reading advanced configuration");

        return await this.executeCommand(new RequestAdvancedConfigCommand());
    }
    
    async readLockState(): Promise<SmartLockResponse> {
        this.debug("Reading lock state");

        return await this.executeCommand(new KeyTurnerStatesCommand());
    }

    async unlock(): Promise<SmartLockResponse> {
        this.debug("Unlocking");

        return await this.executeCommand(new LockActionCommand(LockAction.UNLOCK));
    }

    async lock(): Promise<SmartLockResponse> {
        this.debug("Locking");

        return await this.executeCommand(new LockActionCommand(LockAction.LOCK));
    }

    private async setupUSDIOListener(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.nukiUserCharacteristic!.subscribe((error?: string) => {
                if (error) {
                    reject(error);
                    return;
                }

                this.nukiUserCharacteristic!.on('data', (data: Buffer, isNotification: boolean) => this.usdioDataReceived(data, isNotification));

                resolve();
            });
        });
    }

    private async removeUSDIOListener(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.nukiUserCharacteristic!.removeListener('data', this.usdioDataReceived);

            if (this.isConnected()) {
                this.nukiUserCharacteristic!.unsubscribe((error?: string) => {
                    if (error) {
                        reject(error);
                    }
    
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    static prepareCommand(command: Command, data?: Buffer | null): Buffer {
        // We need 2 bytes for the command;
        let buffer = new Buffer(2);

        buffer.writeUInt16LE(command, 0);

        if (data === null || data === undefined) {
            data = new Buffer(0);
        }

        return Buffer.concat([buffer, data]);
    }

    private async writeEncryptedData(data: Buffer, challenge?: Buffer): Promise<void> {
        if (!this.config || !this.paired) {
            throw new Error("Encrypted commands can only be sent for already paired smart locks.");
        }

        // We need 4 bytes for the authorization id
        let authIdBuf = new Buffer(4);

        authIdBuf.writeUInt32LE(this.config.authorizationId, 0);

        data = Buffer.concat([authIdBuf, data]);

        if (challenge) {
            data = Buffer.concat([data, challenge]);
        }

        let dataCrc: Buffer = SmartLock.appendCRC(data);

        let nonce: Uint8Array = SmartLock.generateNonce();

        let encryptedData: Uint8Array = sodium.crypto_secretbox_easy(dataCrc, nonce, this.config.credentials.sharedSecret);

        let lengthBuf: Buffer = new Buffer(2);
        lengthBuf.writeUInt16LE(encryptedData.length, 0);

        let header: Buffer = Buffer.concat([nonce, authIdBuf, lengthBuf]);

        let message: Buffer = Buffer.concat([header, encryptedData]);

        return new Promise<void>((resolve, reject) => {
            this.nukiUserCharacteristic!.write(message, false, (error) => {
                if (error) {
                    reject(error);
                } else {
                    this.state = GeneralState.RECEIVING_DATA;
                    resolve();
                }
            });
        })
    }

    static generateNonce(size: number = 24): Uint8Array {
        return sodium.randombytes_buf(size);
    }

    private usdioDataReceived(payload: Buffer, isNotification: boolean): void {
        if (!this.config || !this.paired) {
            throw new Error("Data can only be received for already paired smart locks.");
        }

        // We did not expect any data
        if (this.state != GeneralState.RECEIVING_DATA) {
            this.debug("We didn't expected any data but still got some :(");
            return;
        }

        payload = Buffer.concat([this.partialPayload, payload]);

        // In case we cannot read the message length in the first packet
        if (payload.length < 30) {
            this.partialPayload = payload;
            return;
        }

        let messageLength: number = payload.readUInt16LE(28);
        let encryptedMessage: Buffer = payload.slice(30);

        if (encryptedMessage.length < messageLength) {
            this.partialPayload = payload;
            return;
        } else if (encryptedMessage.length > messageLength) {
            this.emit("error", "We received too much data.");
            this.resetCommand();
            return;
        }

        // We have received the full message
        this.partialPayload = new Buffer(0);

        let nonce: Buffer = payload.slice(0, 24);
        let authIdentifierUnencrypted: number = payload.readUInt32LE(24);

        if (authIdentifierUnencrypted != this.config.authorizationId) {
            this.emit("error", "Invalid authorization identifier");
            this.resetCommand();
            return;
        }

        let decryptedPayload: Buffer;
        try {
            decryptedPayload = Buffer.from(sodium.crypto_secretbox_open_easy(encryptedMessage, nonce, this.config.credentials.sharedSecret));
        } catch (err) {
            this.emit("error", "We could not decrypt the payload");
            this.resetCommand();
            return;
        }

        // Validate CRC
        if (!this.validateCRC(decryptedPayload)) return;

        let authIdentifierEncrypted: number = decryptedPayload.readUInt32LE(0);

        if (authIdentifierEncrypted != this.config.authorizationId) {
            this.emit("error", "Invalid authorization identifier in encrypted payload");
            this.resetCommand();
            return;
        }

        let commandIdentifier: number = decryptedPayload.readUInt16LE(4);
        
        let decryptedData: Buffer = decryptedPayload.slice(6, decryptedPayload.length - 2);

        if (this.currentCommand) {
            this.currentCommand.handleData(commandIdentifier, decryptedData);

            if (this.currentCommand.complete) {
                this.currentCommand.sendResponse();
                this.resetCommand();
            }
        } else {
            this.emit("error", "We received a message and expected one but have no active command. Bug?");
            this.resetCommand();
        }

    }

    private resetCommand() {
        this.currentCommand = null;
        this.partialPayload = new Buffer(0);
    }

    get uuid(): string {
        return this.device.uuid;
    }

    get stale(): boolean {
        return this._stale;
    }

    debug(message: string | number) {
        this.nubli.debug(this.device.uuid + ": " + message);
    }
}
