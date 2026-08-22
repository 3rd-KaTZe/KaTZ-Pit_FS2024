// Test Serveur v01
// Serveur de télémétrie pour MSFS 2024 utilisant node-simconnect
// Fonctionnement Local uniquement, pas de serveur distant pour l'instant
//
// Affichage des données de télémétrie dans la console
//
// KaTZe : 2026/08/22

const { open, Protocol, SimConnectDataType, SimConnectConstants, SimConnectPeriod } = require('node-simconnect');

const DEFINITION_ID = 0;
const REQUEST_ID = 0;

async function startTelemetryServer() {
    try {
        console.log("Connecting to MSFS 2024...");
        const connection = await open('MSFS 2024 Telemetry Client', Protocol.SunRise);
        console.log(`Connected to: ${connection.recvOpen.applicationName}`);
        
        const { handle } = connection;

        // 1. Add variables to our data definition
        // Note: The order matters when reading the binary buffer back!
        handle.addToDataDefinition(DEFINITION_ID, 'PLANE ALTITUDE', 'feet', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_ID, 'AIRSPEED TRUE', 'knots', SimConnectDataType.FLOAT64);
        handle.addToDataDefinition(DEFINITION_ID, 'GENERAL ENG RPM:1', 'rpm', SimConnectDataType.FLOAT64);

        // 2. Request the data continuously every second (or use SIM_FRAME for every frame)
        handle.requestDataOnSimObject(
            REQUEST_ID, 
            DEFINITION_ID, 
            SimConnectConstants.OBJECT_ID_USER, 
            SimConnectPeriod.SECOND
        );

        // 3. Listen for the incoming data event
        handle.on('simObjectData', (recvSimObjectData) => {
            if (recvSimObjectData.requestID === REQUEST_ID) {
                // Read the data in the exact order you added them to the definition
                const altitude = recvSimObjectData.data.readFloat64();
                const airspeed = recvSimObjectData.data.readFloat64();
                const rpm = recvSimObjectData.data.readFloat64();

                console.log(`Altitude: ${altitude.toFixed(1)} ft | Airspeed: ${airspeed.toFixed(1)} kts | RPM: ${rpm.toFixed(1)}`);
            }
        });

        handle.on('close', () => {
            console.log('Connection closed.');
        });

    } catch (error) {
        console.error('Connection failed:', error);
    }
}

startTelemetryServer();