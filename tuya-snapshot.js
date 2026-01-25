module.exports = function(RED) {
  function TuyaSnapshotNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.on('input', function(msg) {
      // Lógica para obtener snapshot de cámara Tuya
      // Aquí iría la integración con la API de Tuya
      node.send(msg);
    });
  }
  RED.nodes.registerType("tuya-snapshot", TuyaSnapshotNode);
};
