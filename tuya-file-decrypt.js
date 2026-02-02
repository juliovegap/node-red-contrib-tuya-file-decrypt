module.exports = function(RED) {
    function TuyaFileDecrypt(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        const tuya = require("./lib/tuya");
        const decrypt = require("./lib/decrypt");

        // Set default endpoint if missing (defaults to Europe)
        if (!config.endpoint) config.endpoint = "https://openapi.tuyaeu.com";

        node.on("input", async function(msg) {
            try {
                // --- 1. Payload Parsing & Extraction ---
                let bucket, file, key;
                let decoded = msg.payload;

                // Handle Base64 string payload (Tuya raw format)
                if (typeof decoded === 'string' && !decoded.trim().startsWith('{')) {
                    try {
                        decoded = JSON.parse(Buffer.from(decoded, "base64").toString());
                    } catch (e) {
                        node.warn("Payload is string but not valid Base64 JSON. Treating as object...");
                    }
                }

                // Extract data from standard Tuya format (DPS 185)
                // Structure: { bucket: "...", files: [ ["/path/to/img", "AES_KEY"] ] }
                if (decoded && decoded.files && Array.isArray(decoded.files) && decoded.files.length > 0) {
                    bucket = decoded.bucket;
                    file = decoded.files[0][0];
                    key = decoded.files[0][1];
                } 
                // Fallback: Check if user injected data manually via msg properties
                else if (msg.bucket && msg.file) {
                    bucket = msg.bucket;
                    file = msg.file;
                    key = msg.encryptionKey;
                }

                // Validation
                if (!bucket || !file || !key) {
                    node.error("Missing critical data: 'bucket', 'file', or 'key'. Ensure you are passing the raw Tuya message.");
                    return;
                }

                // Ensure key is a string
                key = String(key);

                // --- 2. URL Strategy (Plan A vs Plan B) ---
                const ctx = tuya.createContext(config);
                let downloadUrl = null;

                // PLAN A: Try to get a Signed URL from Tuya API
                // This resolves the 403 Forbidden error on private buckets.
                try {
                    downloadUrl = await tuya.getSignedUrl(ctx, config.deviceId, bucket, file);
                    if (downloadUrl) {
                        node.log("Successfully obtained Signed URL from API.");
                    }
                } catch (err) {
                    // Ignore error and proceed to Plan B
                }

                // PLAN B: Construct Manual S3 URL (Fallback)
                // If Plan A failed, we try to guess the S3 URL.
                if (!downloadUrl) {
                    const cleanFile = file.startsWith("/") ? file.slice(1) : file;
                    
                    // Note: This URL structure is specific to EU Central. 
                    // If the bucket is strictly private, this WILL fail with 403, 
                    // implying the user MUST enable "IP Camera" service in Tuya IoT.
                    downloadUrl = `https://${bucket}.s3.eu-central-1.amazonaws.com/${cleanFile}`;
                    
                    node.warn(`Using fallback S3 URL: ${downloadUrl}`);
                }

                // --- 3. Download & Decrypt ---
                node.status({fill:"yellow", shape:"ring", text:"Decrypting..."});
                
                try {
                    const imageBuffer = await decrypt.decryptFile(downloadUrl, key);
                    
                    // Prepare Output
                    msg.payload = imageBuffer.toString("base64"); // Base64 for Dashboard
                    msg.image = imageBuffer; // Binary buffer for file writing
                    msg.fileUrl = downloadUrl; // For debugging
                    
                    node.send(msg);
                    node.status({fill:"green", shape:"dot", text:"Success"});

                } catch (err) {
                    // Specialized Error Handling
                    if (err.message.includes("403")) {
                        node.error("Error 403: S3 Access Denied. You MUST authorize the 'IP Camera' service in Tuya IoT Platform to allow URL signing.");
                    } else {
                        node.error(`Decryption error: ${err.message}`);
                    }
                    node.status({fill:"red", shape:"dot", text:"Failed"});
                }

            } catch (err) {
                node.error(`Unexpected error: ${err.message}`);
                node.status({fill:"red", shape:"dot", text:"Error"});
            }
        });
    }

    RED.nodes.registerType("tuya-file-decrypt", TuyaFileDecrypt);
};
