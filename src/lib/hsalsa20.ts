/**
 * Original Source: https://github.com/as19git67/nukible/blob/master/hsalsa20.js
 * License: MIT
 * 
**/

export class Hsalsa20 {
    static readonly ROUNDS: number = 20;

    // near clone of Java's casting of integers to bytes
    // warning: doesn't handle negative integers properly
    static toByte(i: number): number {
        return ((i + 128) % 256) - 128;
    }

    static rotate(u: number, c: number): number {
        return (u << c) | (u >>> (32 - c));
    }

    static load_littleendian(x: any, offset: number): number {
        return (parseInt(x[offset]) & 0xff) |
            (((parseInt(x[offset + 1]) & 0xff)) << 8) |
            (((parseInt(x[offset + 2]) & 0xff)) << 16) |
            (((parseInt(x[offset + 3]) & 0xff)) << 24);
    }

    static store_littleendian(x: Buffer, offset: number, u: number): void {
        x[offset] = Hsalsa20.toByte(u);
        u >>>= 8;
        x[offset + 1] = Hsalsa20.toByte(u);
        u >>>= 8;
        x[offset + 2] = Hsalsa20.toByte(u);
        u >>>= 8;
        x[offset + 3] = Hsalsa20.toByte(u);
    }

    static crypto_core(outv: Buffer, inv: Buffer, k: Uint8Array, c: Buffer): number {
        let x0, x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15;
        let j0, j1, j2, j3, j4, j5, j6, j7, j8, j9, j10, j11, j12, j13, j14, j15;
        let i;

        j0 = x0 = Hsalsa20.load_littleendian(c, 0);
        j1 = x1 = Hsalsa20.load_littleendian(k, 0);
        j2 = x2 = Hsalsa20.load_littleendian(k, 4);
        j3 = x3 = Hsalsa20.load_littleendian(k, 8);
        j4 = x4 = Hsalsa20.load_littleendian(k, 12);
        j5 = x5 = Hsalsa20.load_littleendian(c, 4);

        if (inv != null) {
            j6 = x6 = Hsalsa20.load_littleendian(inv, 0);
            j7 = x7 = Hsalsa20.load_littleendian(inv, 4);
            j8 = x8 = Hsalsa20.load_littleendian(inv, 8);
            j9 = x9 = Hsalsa20.load_littleendian(inv, 12);
        }
        else {
            j6 = x6 = j7 = x7 = j8 = x8 = j9 = x9 = 0;
        }

        j10 = x10 = Hsalsa20.load_littleendian(c, 8);
        j11 = x11 = Hsalsa20.load_littleendian(k, 16);
        j12 = x12 = Hsalsa20.load_littleendian(k, 20);
        j13 = x13 = Hsalsa20.load_littleendian(k, 24);
        j14 = x14 = Hsalsa20.load_littleendian(k, 28);
        j15 = x15 = Hsalsa20.load_littleendian(c, 12);

        for (i = Hsalsa20.ROUNDS; i > 0; i -= 2) {
            x4 ^= Hsalsa20.rotate(x0 + x12, 7);
            x8 ^= Hsalsa20.rotate(x4 + x0, 9);
            x12 ^= Hsalsa20.rotate(x8 + x4, 13);
            x0 ^= Hsalsa20.rotate(x12 + x8, 18);
            x9 ^= Hsalsa20.rotate(x5 + x1, 7);
            x13 ^= Hsalsa20.rotate(x9 + x5, 9);
            x1 ^= Hsalsa20.rotate(x13 + x9, 13);
            x5 ^= Hsalsa20.rotate(x1 + x13, 18);
            x14 ^= Hsalsa20.rotate(x10 + x6, 7);
            x2 ^= Hsalsa20.rotate(x14 + x10, 9);
            x6 ^= Hsalsa20.rotate(x2 + x14, 13);
            x10 ^= Hsalsa20.rotate(x6 + x2, 18);
            x3 ^= Hsalsa20.rotate(x15 + x11, 7);
            x7 ^= Hsalsa20.rotate(x3 + x15, 9);
            x11 ^= Hsalsa20.rotate(x7 + x3, 13);
            x15 ^= Hsalsa20.rotate(x11 + x7, 18);
            x1 ^= Hsalsa20.rotate(x0 + x3, 7);
            x2 ^= Hsalsa20.rotate(x1 + x0, 9);
            x3 ^= Hsalsa20.rotate(x2 + x1, 13);
            x0 ^= Hsalsa20.rotate(x3 + x2, 18);
            x6 ^= Hsalsa20.rotate(x5 + x4, 7);
            x7 ^= Hsalsa20.rotate(x6 + x5, 9);
            x4 ^= Hsalsa20.rotate(x7 + x6, 13);
            x5 ^= Hsalsa20.rotate(x4 + x7, 18);
            x11 ^= Hsalsa20.rotate(x10 + x9, 7);
            x8 ^= Hsalsa20.rotate(x11 + x10, 9);
            x9 ^= Hsalsa20.rotate(x8 + x11, 13);
            x10 ^= Hsalsa20.rotate(x9 + x8, 18);
            x12 ^= Hsalsa20.rotate(x15 + x14, 7);
            x13 ^= Hsalsa20.rotate(x12 + x15, 9);
            x14 ^= Hsalsa20.rotate(x13 + x12, 13);
            x15 ^= Hsalsa20.rotate(x14 + x13, 18);
        }

        x0 += j0;
        x1 += j1;
        x2 += j2;
        x3 += j3;
        x4 += j4;
        x5 += j5;
        x6 += j6;
        x7 += j7;
        x8 += j8;
        x9 += j9;
        x10 += j10;
        x11 += j11;
        x12 += j12;
        x13 += j13;
        x14 += j14;
        x15 += j15;

        x0 -= Hsalsa20.load_littleendian(c, 0);
        x5 -= Hsalsa20.load_littleendian(c, 4);
        x10 -= Hsalsa20.load_littleendian(c, 8);
        x15 -= Hsalsa20.load_littleendian(c, 12);

        if (inv !== undefined /* null*/) {
            x6 -= Hsalsa20.load_littleendian(inv, 0);
            x7 -= Hsalsa20.load_littleendian(inv, 4);
            x8 -= Hsalsa20.load_littleendian(inv, 8);
            x9 -= Hsalsa20.load_littleendian(inv, 12);
        }

        Hsalsa20.store_littleendian(outv, 0, x0);
        Hsalsa20.store_littleendian(outv, 4, x5);
        Hsalsa20.store_littleendian(outv, 8, x10);
        Hsalsa20.store_littleendian(outv, 12, x15);
        Hsalsa20.store_littleendian(outv, 16, x6);
        Hsalsa20.store_littleendian(outv, 20, x7);
        Hsalsa20.store_littleendian(outv, 24, x8);
        Hsalsa20.store_littleendian(outv, 28, x9);

        return 0;
    }
}
