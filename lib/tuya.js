const { TuyaContext } = require("@tuya/tuya-connector-nodejs");

/**
 * Creates the Tuya Context for API Authentication.
 */
function createContext(config) {
    return new TuyaContext({
        baseUrl: config.endpoint,
        accessKey: config.accessId,
        secretKey: config.accessKey
    });
}

/**
 * Attempts to get a Signed URL for a specific file path.
 * This is useful for Doorbell/Peephole devices where S3 buckets are private.
 * * @param {Object} ctx - Tuya Context
 * @param {string} deviceId - The device ID
 * @param {string} bucket - The S3 bucket name
 * @param {string} file - The file path inside the bucket
 */
async function getSignedUrl(ctx, deviceId, bucket, file) {
    try {
        // Using the specific Doorbell API to sign the URL
        const path = `/v1.0/devices/${deviceId}/doorbells/pic-url`;
        
        // console.log(`[Tuya] Requesting signature for file: ${file}`);
        
        const res = await ctx.request({
            method: "POST",
            path: path,
            body: {
                bucket: bucket,
                filePath: file
            }
        });

        // If successful, return the public signed URL
        if (res.result && res.result.url) {
            return res.result.url;
        }
        return null;

    } catch (err) {
        // If API fails (e.g., permission denied), return null to trigger fallback
        // console.log("[Tuya] Warning: Signed URL request failed.", err.message);
        return null; 
    }
}

module.exports = { createContext, getSignedUrl };
