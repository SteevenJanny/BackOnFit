import {Capacitor} from '@capacitor/core';
import {SecureStorage} from '@aparajita/capacitor-secure-storage';

const DB_KEY_NAME = 'sqlite_db_key';

export class DbKeyService {

    static async getOrCreateKey(): Promise<string | null> {
        if (Capacitor.getPlatform() === 'web') {
            return null; // no encryption on web
        }

        // Try to get existing key
        const existing = await SecureStorage.get(DB_KEY_NAME)
            .then(r => r)
            .catch(() => null);
        // If existing is a string, return it
        if (existing && typeof existing === 'string') {
            return existing;
        }

        // Create new random key (256-bit equivalent)
        const newKey = crypto.getRandomValues(new Uint8Array(32));
        const keyBase64 = btoa(
            String.fromCharCode(...newKey)
        );

        await SecureStorage.set(
            DB_KEY_NAME,
            keyBase64
        );

        return keyBase64;
    }
}
