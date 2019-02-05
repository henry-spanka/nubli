import { Credentials } from "./credentials";
import sodium from "libsodium-wrappers";
import fs from "fs";
import arrayBufferToHex from "array-buffer-to-hex";
import hexToArrayBuffer from "hex-to-array-buffer";

export class NukiConfig {
    private _credentials: Credentials;
    private _appId: number;
    private _authorizationId: number | undefined = undefined;
    private _slUUID: Uint8Array | undefined = undefined;
    private _uuid: string;
    private _paired: boolean;

    constructor(uuid: string, paired: boolean = false, credentials?: Credentials, appId?: number, authorizationId?: number, slUUID?: Uint8Array) {
        if (credentials == null) {
            credentials = new Credentials();
        }
        if (appId == null) {
            appId = new Buffer(sodium.randombytes_buf(4)).readUInt32LE(0);
        }

        this._uuid = uuid;
        this._paired = paired;
        this._credentials = credentials;
        this._appId = appId;
        this._authorizationId = authorizationId;
        this._slUUID = slUUID;
    }

    serialize(): any {
        return {
            uuid: this._uuid,
            paired: this._paired,
            credentials: this.credentials.serialize(),
            appId: this._appId,
            authorizationId: this._authorizationId,
            slUUID: arrayBufferToHex(this._slUUID!)
        };
    }

    get uuid(): string {
        return this._uuid;
    }

    get paired(): boolean {
        return this._paired;
    }

    set paired(paired: boolean) {
        this._paired = paired;
    }

    get credentials(): Credentials {
        return this._credentials;
    }

    get appId(): number {
        return this._appId;
    }

    get authorizationId(): number {
        if (this._authorizationId == undefined) {
            throw new Error("Authorization ID not set");
        }

        return this._authorizationId;
    }

    set authorizationId(authId: number) {
        if (this._authorizationId) {
            throw new Error("Authorization ID cannot be overwritten.");
        }

        this._authorizationId = authId;
    }

    get slUUID(): Uint8Array {
        if (this._slUUID == undefined) {
            throw new Error("Authorization ID not set");
        }

        return this._slUUID;
    }

    set slUUID(slUUID: Uint8Array) {
        if (this._slUUID) {
            throw new Error("Smart Lock UUID cannot be overwritten.");
        }

        this._slUUID = slUUID;
    }

    static async readConfig(uuid: string, path: string): Promise<NukiConfig> {
        return new Promise<NukiConfig>((resolve, reject) => {
            fs.readFile(path + uuid + ".json", (err, buf) => {
                if (err) {
                    reject(err);
                } else {
                    let data = JSON.parse(buf.toString());
                    let credentials: Credentials = new Credentials(
                        new Uint8Array(hexToArrayBuffer(data.credentials.publicKey)),
                        new Uint8Array(hexToArrayBuffer(data.credentials.privateKey)),
                        Buffer.from(data.credentials.slPublicKey, 'hex'),
                        Buffer.from(data.credentials.sharedSecret, 'hex')
                    );

                    let nukiConfig: NukiConfig = new NukiConfig(
                        data.uuid,
                        data.paired,
                        credentials,
                        data.appId,
                        data.authorizationId,
                        new Uint8Array(hexToArrayBuffer(data.slUUID)),
                    );

                    resolve(nukiConfig);
                }
            });
        });
    
    }

    static configExists(uuid: string, path: string): boolean {
        try {
            fs.accessSync(path + uuid + ".json", fs.constants.R_OK);
            return true;
        } catch (e) {
            return false;
        }
    }

    async save(path: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.writeFile(path + this.uuid + ".json", JSON.stringify(this.serialize()), (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
