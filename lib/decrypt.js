const crypto = require("crypto");
const axios = require("axios");

/**
 * Downloads and decrypts a file from a URL using AES-CBC.
 * @param {string} url - The URL of the encrypted file (S3).
 * @param {string} key - The encryption key (plaintext).
 * @returns {Promise<Buffer>} - The decrypted image/video buffer.
 */
async function decryptFile(url, key) {
    try {
        // 1. Download the file as a binary buffer
        const response = await axios.get(url, { responseType: "arraybuffer" });
        const fileData = Buffer.from(response.data);

        // Basic validation of file size
        if (fileData.length < 64) {
            throw new Error(`File is too small (${fileData.length} bytes). Likely invalid or empty.`);
        }

        // 2. Extract IV and Encrypted Data based on Tuya header structure
        // IV: usually bytes 4 to 20 (16 bytes)
        const iv = fileData.subarray(4, 20);
        
        // Data: usually starts from byte 64
        const encrypted = fileData.subarray(64);

        // 3. Perform decryption
        return decryptAES(encrypted, key, iv);

    } catch (error) {
        // Re-throw with context
        throw new Error(`Decrypt failed: ${error.message}`);
    }
}

/**
 * Low-level AES decryption logic
 */
function decryptAES(buffer, key, iv) {
    let algorithm;
    
    // Auto-detect algorithm based on key length
    switch (key.length) {
        case 16: algorithm = 'aes-128-cbc'; break;
        case 24: algorithm = 'aes-192-cbc'; break;
        case 32: algorithm = 'aes-256-cbc'; break;
        default: throw new Error(`Invalid AES Key length: ${key.length}. Expected 16, 24, or 32.`);
    }

    // Create the decipher instance
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'utf8'), iv);
    
    // Tuya uses PKCS7 padding (default in Node.js)
    // decipher.setAutoPadding(true); 

    // Process the buffer
    const decrypted = Buffer.concat([decipher.update(buffer), decipher.final()]);
    
    return decrypted;
}

module.exports = { decryptFile };
