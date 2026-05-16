import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = ALPHABET.length;
const ID_LEN = 6;
const SIG_LEN = 6;
const TOKEN_LEN = ID_LEN + SIG_LEN;
const MOD = BASE ** ID_LEN;
const MOD_BI = BigInt(MOD);

@Injectable()
export class HashIdService {
    decode(token: string): number {
        token = this.cleanToken(token).toUpperCase();

        if (token.length !== TOKEN_LEN) throw new Error('token inválido');

        const idPart = token.slice(0, ID_LEN);
        const sigPart = token.slice(-SIG_LEN);

        const { a, b } = this.affineParams();

        const expectedSig = crypto
            .createHmac('sha256', process.env.HASH_ID_KEY)
            .update(idPart)
            .digest('hex')
            .slice(0, SIG_LEN)
            .toUpperCase();

        if (sigPart !== expectedSig) throw new Error('assinatura inválida');

        const obfId = BigInt(this.fromBase36(idPart));
        const aInv = this.modInverse(a, MOD_BI);
        const id = Number((((obfId - b + MOD_BI) % MOD_BI) * aInv) % MOD_BI);

        if (id <= 0 || id > MOD - 1) throw new Error('id inválido');

        return id;
    }

    encode(id: number): string {
        if (!Number.isSafeInteger(id) || id <= 0 || id > MOD - 1) {
            throw new Error('id inválido');
        }

        const { a, b } = this.affineParams();
        const obfId = Number((BigInt(id) * a + b) % MOD_BI);
        const idBase36 = this.toBase36(obfId).padStart(ID_LEN, '0');

        const sig = crypto
            .createHmac('sha256', process.env.HASH_ID_KEY)
            .update(idBase36)
            .digest('hex')
            .slice(0, SIG_LEN)
            .toUpperCase();

        return this.formatToken(idBase36 + sig);
    }

    private affineParams(): { a: bigint; b: bigint } {
        const key = process.env.HASH_ID_KEY ?? '';
        const hash = crypto.createHash('sha256').update(key).digest();
        let a = BigInt(hash.readUInt32BE(0)) % MOD_BI | 1n;
        const b = BigInt(hash.readUInt32BE(4)) % MOD_BI;
        if (a === 0n) a = 1n;
        while (this.gcd(a, MOD_BI) !== 1n) a += 2n;
        return { a: a % MOD_BI, b };
    }

    private gcd(a: bigint, b: bigint): bigint {
        while (b !== 0n) {
            const t = a % b;
            a = b;
            b = t;
        }
        return a;
    }

    private modInverse(a: bigint, mod: bigint): bigint {
        let t = 0n, newT = 1n;
        let r = mod, newR = a;
        while (newR !== 0n) {
            const q = r / newR;
            [t, newT] = [newT, t - q * newT];
            [r, newR] = [newR, r - q * newR];
        }
        if (r > 1n) throw new Error('id inválido');
        if (t < 0n) t += mod;
        return t;
    }

    private toBase36(num: number): string {
        let str = '';
        while (num > 0) {
            str = ALPHABET[num % BASE] + str;
            num = Math.floor(num / BASE);
        }
        return str || '0';
    }

    private fromBase36(str: string): number {
        return str.split('').reduce((acc, char) => acc * BASE + ALPHABET.indexOf(char), 0);
    }

    private formatToken(token: string): string {
        return token.match(/.{1,4}/g)?.join('-') ?? token;
    }

    private cleanToken(token: string): string {
        return token.replace(/-/g, '');
    }
}
