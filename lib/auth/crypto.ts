import crypto from 'node:crypto'
import { ApiError } from '../utils/response'

export function verifyAgentSignature(payload: string, signatureHex: string, publicKeyHex: string): void {
    try {
        const publicKeyBytes = Buffer.from(publicKeyHex, 'hex')
        const signatureBytes = Buffer.from(signatureHex, 'hex')

        // Create a public key object from the raw Ed25519 bytes
        const key = crypto.createPublicKey({
            key: Buffer.concat([
                Buffer.from('302a300506032b6570032100', 'hex'), // ASN.1 DER prefix for Ed25519
                publicKeyBytes
            ]),
            format: 'der',
            type: 'spki'
        })

        const isValid = crypto.verify(null, Buffer.from(payload), key, signatureBytes)

        if (!isValid) {
            throw new ApiError('Cryptographic signature verification failed', 'INVALID_SIGNATURE', 401)
        }
    } catch (error) {
        if (error instanceof ApiError) throw error
        throw new ApiError('Malformed cryptographic signature or public key', 'MALFORMED_SIGNATURE', 400)
    }
}
