import { PairingState, Command, GeneralError, Status } from "./states";
import { NukiConfig } from "./nukiConfig";
import { ErrorHandler } from "./errorHandler";
import Events from "events";
import crypto from "crypto";
import { SmartLock } from "./smartLock";

export class SmartLockPairer extends Events.EventEmitter {
    private nukiPairingCharacteristic: import("noble").Characteristic;
    private state: PairingState = PairingState.IDLE;
    private config: NukiConfig;
    private partialPayload: Buffer | null = null;
    private nonceABF: Uint8Array | null = null;
    private asBridge: boolean;

    // The first packet should not be verified as it does not contain any CRC and is only partial.
    private verifyCRC: boolean = false;

    constructor(nukiPairingCharacteristic: import("noble").Characteristic, nukiConfig: NukiConfig, asBridge: boolean) {
        super();

        if (nukiPairingCharacteristic === null) {
            throw new Error("characteristic cannot be null");
        }

        this.nukiPairingCharacteristic = nukiPairingCharacteristic;
        this.config = nukiConfig;
        this.asBridge = asBridge;
    }

    private async setupPairListener(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.nukiPairingCharacteristic.subscribe((error?: string) => {
                if (error) {
                    reject(error);
                    return;
                }

                this.nukiPairingCharacteristic.on('data', (data: Buffer, isNotification: boolean) => this.pairingDataReceived(data, isNotification));

                resolve();
            });
        });
    }

    private async removePairListener(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.nukiPairingCharacteristic.unsubscribe((error?: string) => {
                this.nukiPairingCharacteristic.removeListener('data', this.pairingDataReceived);
                if (error) {
                    reject(error);
                }

                resolve();
            });
        });
    }

    private async writeData(data: Buffer): Promise<void> {
        let dataCrc: Buffer = SmartLock.appendCRC(data);

        return new Promise<void>((resolve, reject) => {
            this.nukiPairingCharacteristic.write(dataCrc, false, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        })
    }

    private validateCRC(data: Buffer): boolean {
        if (this.partialPayload) {
            data = Buffer.concat([this.partialPayload, data]);
        }

        if (!SmartLock.verifyCRC(data)) {
            let errorMessage = ErrorHandler.errorToMessage(GeneralError.BAD_CRC);

            this.emit("pairingFailed", errorMessage);
            
            return false;
        }

        return true;
    }

    private getCommandFromPayload(payload: Buffer): number {
        return payload.readUInt16LE(0);
    }

    private getDataFromPayload(payload: Buffer): Buffer {
        return payload.slice(2, payload.length - 2);
    }

    private printErrorMessage(message: string, payload?: Buffer): void {
        if (payload != null) {
            if (this.getCommandFromPayload(payload) == Command.ERROR_REPORT) {
                let errorMessage = ErrorHandler.errorToMessage(payload.readInt8(2));

                this.emit("pairingFailed", errorMessage);
            } else {
                this.emit("pairingFailed", message);
            }
        } else {
            this.emit("pairingFailed", message);
        }

    }

    private pairingDataReceived(payload: Buffer, isNotification: boolean): void {
        // Only check CRC if we should.
        if (this.verifyCRC && !this.validateCRC(payload)) return;

        let data: Buffer;

        switch (this.state) {
            // Smartlock sent first half of it's public key
            case PairingState.REQ_PUB_KEY:
                if (this.getCommandFromPayload(payload) != Command.PUBLIC_KEY) {
                    this.printErrorMessage("Unexpected data received during REQ_PUB_KEY", payload);
                } else {
                    this.partialPayload = payload;
                    this.verifyCRC = true;
                    this.state = PairingState.REQ_PUB_KEY_FIN;
                }
                break;

            // Smartlock has sent it's public key. We send ours now.
            case PairingState.REQ_PUB_KEY_FIN:
                this.config.credentials.slPublicKey = this.getDataFromPayload(Buffer.concat([this.partialPayload!, payload]));
                this.partialPayload = null;

                data = SmartLock.prepareCommand(Command.PUBLIC_KEY, new Buffer(this.config.credentials.publicKey));

                this.writeData(data);

                this.verifyCRC = false;
                this.state = PairingState.REQ_CHALLENGE;

                break;

            // SmartLock has sent the first part of the challenge.
            case PairingState.REQ_CHALLENGE:
                if (this.getCommandFromPayload(payload) != Command.CHALLENGE) {
                    this.printErrorMessage("Unexpected data received during REQ_CHALLENGE", payload);
                } else {
                    this.partialPayload = payload;
                    this.verifyCRC = true;
                    this.state = PairingState.REQ_CHALLENGE_FIN;
                }
                break;

            // Smartlock has sent the challenge. We calculate the authenticator and send it.
            case PairingState.REQ_CHALLENGE_FIN:
                let nonceK: Buffer = this.getDataFromPayload(Buffer.concat([this.partialPayload!, payload]));
                this.partialPayload = null;

                let r: Buffer = Buffer.concat([this.config.credentials.publicKey, this.config.credentials.slPublicKey, nonceK]);

                let authenticator: Buffer = crypto.createHmac('SHA256', this.config.credentials.sharedSecret!).update(r).digest();

                data = SmartLock.prepareCommand(Command.AUTH_AUTHENTICATOR, authenticator);

                this.writeData(data);

                this.verifyCRC = false;
                this.state = PairingState.REQ_CHALLENGE_AUTH;

                break;
            
            // Smartlock has sent the first part of the second challenge.
            case PairingState.REQ_CHALLENGE_AUTH:
                if (this.getCommandFromPayload(payload) != Command.CHALLENGE) {
                    this.printErrorMessage("Unexpected data received DURING REQ_CHALLENGE_AUTH", payload);
                } else {
                    this.partialPayload = payload;
                    this.verifyCRC = true;
                    this.state = PairingState.REQ_CHALLENGE_AUTH_FIN;
                }
                break;

            // Smartlock has sent the challenge. We calculate the authorization data and send it.
            case PairingState.REQ_CHALLENGE_AUTH_FIN:
                let nonceK2: Buffer = this.getDataFromPayload(Buffer.concat([this.partialPayload!, payload]));
                this.partialPayload = null;

                let authData: Buffer = this.generateAuthorizationData();

                this.nonceABF = SmartLock.generateNonce(32);

                let r2: Buffer = Buffer.concat([authData, this.nonceABF, nonceK2]);

                let authenticator2: Buffer = crypto.createHmac('SHA256', this.config.credentials.sharedSecret!).update(r2).digest();

                data = Buffer.concat([authenticator2, authData, this.nonceABF]);

                data = SmartLock.prepareCommand(Command.AUTH_DATA, data);

                this.writeData(data);
                
                this.verifyCRC = false;
                this.state = PairingState.REQ_AUTH_ID_A;

                break;

            //Smartlock has sent the first part of the authorization id
            case PairingState.REQ_AUTH_ID_A:
                if (this.getCommandFromPayload(payload) != Command.AUTH_ID) {
                    this.printErrorMessage("Unexpected data received during REQ_AUTH_ID_A", payload);
                } else {
                    this.partialPayload = payload;
                    this.state = PairingState.REQ_AUTH_ID_B;
                }
                break;

            //Smartlock has sent the second part of the authorization id
            case PairingState.REQ_AUTH_ID_B:
                this.partialPayload = Buffer.concat([this.partialPayload!, payload]);
                this.state = PairingState.REQ_AUTH_ID_C;

                break;

            //Smartlock has sent the third part of the authorization id
            case PairingState.REQ_AUTH_ID_C:
                this.partialPayload = Buffer.concat([this.partialPayload!, payload]);
                this.state = PairingState.REQ_AUTH_ID_D;

                break;

            //Smartlock has sent the fourth part of the authorization id
            case PairingState.REQ_AUTH_ID_D:
                this.partialPayload = Buffer.concat([this.partialPayload!, payload]);
                this.verifyCRC = true;
                this.state = PairingState.REQ_AUTH_ID_FIN;

                break;
            //Smartlock has sent the fifth part of the authorization id
            case PairingState.REQ_AUTH_ID_FIN:
                let auth: Buffer = this.getDataFromPayload(Buffer.concat([this.partialPayload!, payload]));
                this.partialPayload = null;

                let authenticator3: Buffer = auth.slice(0, 32);
                let authIdBuf: Buffer = auth.slice(32, 36);
                this.config.authorizationId = authIdBuf.readUInt32LE(0);
                this.config.slUUID = auth.slice(36, 52);
                let nonceK3: Buffer = auth.slice(52, 84);

                let r3: Buffer = Buffer.concat([authIdBuf, this.config.slUUID, nonceK3, this.nonceABF!]);

                let cr = crypto.createHmac('SHA256', this.config.credentials.sharedSecret!).update(r3).digest();

                if (Buffer.compare(authenticator3, cr) !== 0) {
                    this.emit("pairingFailed", "The authenticator could not be verified.");
                } else {
                    let r4 = Buffer.concat([authIdBuf, nonceK3]);
                    let authenticator4 = crypto.createHmac('SHA256', this.config.credentials.sharedSecret!).update(r4).digest();
                    data = SmartLock.prepareCommand(Command.AUTH_ID_CONFIRM, Buffer.concat([authenticator4, authIdBuf]));

                    this.writeData(data);

                    this.state = PairingState.REQ_AUTH_ID_CONFIRM;
                }

                break;
            case PairingState.REQ_AUTH_ID_CONFIRM:
                if (this.getCommandFromPayload(payload) == Command.STATUS && this.getDataFromPayload(payload).readUInt8(0) == Status.COMPLETE) {
                    this.state = PairingState.PAIRED;
                    this.config.paired = true;
                    this.emit("paired");
                } else {
                    this.printErrorMessage("The smart lock indicated that the pairing failed", payload);
                }

                break;

            default:
                this.emit("pairingFailed", "Unexpected data received");
                break;
        }
    }

    private generateAuthorizationData(): Buffer {
        let id: Buffer = new Buffer(5);

        if (this.asBridge) {
            // We are a bridge
            id.writeUInt8(1, 0);
        } else {
            // We are an app
            id.writeUInt8(0, 0);
        }
        
        id.writeUInt32LE(this.config.appId, 1);

        let name = new Buffer(32).fill(' ');
        name.write("Nubli Node.js Library", 0);

        return Buffer.concat([id, name]);
    }

    async pair(): Promise<NukiConfig> {
        this.state = PairingState.IDLE;

        return new Promise<NukiConfig>(async (resolve, reject) => {
            await this.setupPairListener();

            let identifier = new Buffer(2);
            identifier.writeUInt16LE(Command.PUBLIC_KEY, 0);
            let data: Buffer = SmartLock.prepareCommand(Command.REQUEST_DATA, identifier);

            // First step - Request Public Key from SmartLock
            this.state = PairingState.REQ_PUB_KEY;
            this.writeData(data);

            this.on('paired', () => {
                this.removePairListener();

                resolve(this.config);
            });

            this.on('pairingFailed', (error: string) => {
                this.state = PairingState.FAILED;
                this.removePairListener();
                reject(error);
            });
        });
    }
}
