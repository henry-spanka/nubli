import sodium from "libsodium-wrappers";
import arrayBufferToHex from "array-buffer-to-hex";
import { Hsalsa20 } from "./hsalsa20";

export class Credentials {
    private _slPublicKey: Buffer | null = null;
    private _publicKey: Uint8Array;
    private _privateKey: Uint8Array;
    private _sharedSecret: Buffer | null = null;

    constructor(publicKey?: Uint8Array, privateKey?: Uint8Array, slPublicKey?: Buffer | null, sharedSecret?: Buffer | null) {
        if (publicKey == null || privateKey == null) {
            let key: sodium.KeyPair = this.generateKeyPair();

            publicKey = key.publicKey;
            privateKey = key.privateKey;
        }

        if (slPublicKey != null) {
            this._slPublicKey = slPublicKey;
        }

        if (sharedSecret != null) {
            this._sharedSecret = sharedSecret;
        }

        this._publicKey = publicKey;
        this._privateKey = privateKey;
    }

    private generateKeyPair() {
        let key: sodium.KeyPair = sodium.crypto_box_keypair();

        if (key.keyType != "x25519") {
            throw new Error("Key has an unexpected type");
        }

        return key;
    }

    private generateDHKey(): Uint8Array {
        return sodium.crypto_scalarmult(this._privateKey, this.slPublicKey);
    }

    generateSharedKey(): void {
        let dhKey: Uint8Array = this.generateDHKey();

        let sharedSecret: Buffer = new Buffer(32);
        let inv: Buffer = new Buffer(16);
        inv.fill(0);
        let crypto = new Buffer("expand 32-byte k");

        Hsalsa20.crypto_core(sharedSecret, inv, dhKey, crypto);

        this._sharedSecret = sharedSecret;
    }

    serialize() {
        return {
            slPublicKey: this._slPublicKey ? this._slPublicKey.toString('hex') : "",
            publicKey: arrayBufferToHex(this._publicKey),
            privateKey: arrayBufferToHex(this._privateKey),
            sharedSecret: this._sharedSecret ? this._sharedSecret.toString('hex') : "",
        };
    }

    get slPublicKey(): Buffer {
        if (!this._slPublicKey) {
            throw new Error("Smart Lock public key is missing.");
        }

        return this._slPublicKey;
    }

    set slPublicKey (publicKey: Buffer) {
        if (this._slPublicKey) {
            throw new Error("Cannot override an already set Smart Lock public key.");
        }

        this._slPublicKey = publicKey;
    }

    get publicKey(): Uint8Array {
        return this._publicKey;
    }

    get sharedSecret(): Buffer {
        if (!this._sharedSecret) {
            this.generateSharedKey();
        }

        return this._sharedSecret!;
    }
}
