declare class hsalsa20 {
    crypto_core: (outv: Buffer, inv: Buffer, k: Uint8Array, c: Buffer) => number;
}

export = hsalsa20;
