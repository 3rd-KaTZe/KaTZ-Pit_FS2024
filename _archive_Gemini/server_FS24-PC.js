// server.js (Sur le PC de Jeu)
const { open, Protocol } = require('node-simconnect');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
let clients = [];

// 1. Gestion des connexions du PC Portable (WebSockets)
wss.on('connection', (ws) => {
    clients.push(ws);
    console.log("[KATZPIT] Client déporté connecté.");

    // ÉCOUTE DES COMMANDES VENANT DU PC PORTABLE
    ws.on('message', (message) => {
        try {
            const command = JSON.parse(message);
            console.log(`[KATZPIT] Commande reçue du portable :`, command);
            
            if (global.simHandle && command.action === "TOGGLE_PARKING_BRAKE") {
                // Dans MSFS, pour déclencher une action, on envoie un événement "K:" (KEY_EVENT)
                global.simHandle.sendEvent("PARKING_BRAKES"); 
                console.log("[KATZPIT] Événement 'PARKING_BRAKES' envoyé à MSFS.");
            }
        } catch (e) {
            console.error("[KATZPIT] Erreur décodage commande :", message);
        }
    });
});

// 2. Connexion à MSFS 2024 via SimConnect
open('Katzpit Bridge', Protocol.MSFS2024)
    .then((simConnect) => {
        console.log("[KATZPIT] Connecté à MSFS 2024 via SimConnect.");
        global.simHandle = simConnect; // On garde la main pour les commandes

        // Définition des SimVars à surveiller
        const simVarsList = [
            ['AIRSPEED INDICATED', 'Knots'],
            ['PLANE ALTITUDE', 'Feet'],
            ['GENERAL ENG RPM:1', 'Rpm'],          // RPM Moteur 1
            ['BRAKE PARKING INDICATOR', 'Bool']     // État du frein de parking (0 ou 1)
        ];

        // Requête en boucle à chaque frame visuelle du simu
        simConnect.requestDataOnSimObject(simVarsList, (data) => {
            const telemetry = JSON.stringify({
                type: "TELEMETRY",
                speed: data['AIRSPEED INDICATED'],
                alt: data['PLANE ALTITUDE'],
                rpm: data['GENERAL ENG RPM:1'],
                parkingBrake: data['BRAKE PARKING INDICATOR']
            });

            // Envoi au PC Portable
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(telemetry);
                }
            });
        }, simConnect.PERIOD_VISUAL_FRAME);
    })
    .catch(err => console.error("[KATZPIT] Erreur SimConnect :", err));
