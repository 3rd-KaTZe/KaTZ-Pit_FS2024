// Test Serveur v02.2
// Serveur de télémétrie pour MSFS 2024 utilisant node-simconnect
// Serveur d'envoi de données de télémétrie vers un client distant (ex: KaTZ-Pit_24)
//
// KaTZe : 2026/08/22

const { open, Protocol, SimConnectDataType, SimConnectConstants, SimConnectPeriod } = require('node-simconnect');
const WebSocket = require('ws');

const DEFINITION_ID = 0;
const REQUEST_ID = 0;

// 1. Création du serveur WebSocket (Port 8000)
const wss = new WebSocket.Server({ port: 8000 });
let clients = [];

wss.on('connection', (ws) => {
    clients.push(ws);
    console.log("Cockpit déporté connecté !");
    
    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
        console.log("Cockpit déporté déconnecté.");
    });
});

// 2. Connexion à MSFS 2024 (Protocole SunRise)
async function startTelemetryServer() {
    try {
        console.log("Connecting to MSFS 2024...");
        const connection = await open('KaTZ-Pit Bridge Server', Protocol.SunRise);
        console.log(`Connected to: ${connection.recvOpen.applicationName}`);
        
        const { handle } = connection;

        // Définition des variables (L'ordre strict correspond au buffer de lecture)
        handle.addToDataDefinition(DEFINITION_ID, 'PLANE ALTITUDE', 'feet', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_ID, 'AIRSPEED TRUE', 'knots', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_ID, 'GENERAL ENG RPM:1', 'rpm', SimConnectDataType.FLOAT64);

        // Requête continue à chaque image simulée
        handle.requestDataOnSimObject(
            REQUEST_ID, 
            DEFINITION_ID, 
            SimConnectConstants.OBJECT_ID_USER, 
            SimConnectPeriod.SIM_FRAME 
        );

        // 3. Écoute et envoi des données aux clients WebSockets
        handle.on('simObjectData', (recvSimObjectData) => {
            if (recvSimObjectData.requestID === REQUEST_ID) {
                // Lecture séquentielle du buffer (3 x FLOAT64 = 24 octets de données)
                const altitude = recvSimObjectData.data.readFloat64();
                const airspeed = recvSimObjectData.data.readFloat64();
                const rpm = recvSimObjectData.data.readFloat64();

                // Structuration JSON pour le client HTML (Remplacement de pitch par rpm)
                const telemetry = JSON.stringify({
                    alt: altitude,
                    speed: airspeed,
                    rpm: rpm
                });

                // Envoi immédiat à l'ordinateur déporté
                clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(telemetry);
                    }
                });
            }
        });

        handle.on('close', () => {
            console.log('MSFS Connection closed.');
        });

    } catch (error) {
        console.error('MSFS Connection failed:', error);
    }
}

startTelemetryServer();
