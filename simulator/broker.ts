import net from "node:net";
import http from "node:http";
import { Aedes } from "aedes";
import { WebSocketServer, createWebSocketStream } from "ws";

const TCP_PORT = Number(process.env.MQTT_TCP_PORT ?? 1883);
const WS_PORT = Number(process.env.MQTT_WS_PORT ?? 8083);

// createBroker existe em runtime (aedes 1.x) mas não está nos tipos.
const aedes: Aedes = await (Aedes as unknown as { createBroker(): Promise<Aedes> }).createBroker();

net.createServer(aedes.handle).listen(TCP_PORT, () => console.log(`[broker] MQTT tcp://localhost:${TCP_PORT}`));

const httpServer = http.createServer();
new WebSocketServer({ server: httpServer }).on("connection", (socket, req) => {
  aedes.handle(createWebSocketStream(socket), req);
});
httpServer.listen(WS_PORT, () => console.log(`[broker] MQTT ws://localhost:${WS_PORT}`));

aedes.on("client", (c) => console.log(`[broker] + ${c.id}`));
aedes.on("clientDisconnect", (c) => console.log(`[broker] - ${c.id}`));
