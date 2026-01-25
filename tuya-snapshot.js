const TuyaConnector = require('@tuya/tuya-connector');

module.exports = function(RED) {
  function TuyaSnapshotNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    const accessId = config.accessId;
    const accessSecret = config.accessSecret;
    const deviceId = config.deviceId;
    const region = config.region || 'eu';
    
    // Crear instancia del conector Tuya
    const tuya = new TuyaConnector({
      accessId: accessId,
      accessSecret: accessSecret,
      region: region
    });

    node.on('input', async function(msg) {
      try {
        // Obtener snapshot de la cámara Tuya
        const snapshotUrl = await tuya.getCameraSnapshot(deviceId);

        // Aquí podrías descargar la imagen o pasar la URL
        msg.payload = { snapshotUrl };
        msg.snapshotDownloadLink = snapshotUrl; // Añadido enlace de descarga
        node.send(msg);
      } catch (error) {
        node.error('Error al obtener snapshot de Tuya: ' + error.message, msg);
      }
    });
  }
  RED.nodes.registerType('tuya-snapshot', TuyaSnapshotNode);
};
