# Digital Twin KR120 (PoC)

Prova de conceito de um gêmeo digital de um manipulador KUKA KR120 em Three.js, movido em tempo real por telemetria MQTT. Serve para dominar a animação 3D por código e o consumo de telemetria antes de trabalhar com os modelos CAD finais do projeto Logix E-Parts.

```
[ plc.ts (simulador) ] --MQTT/TCP--> [ broker aedes ] --MQTT/WebSocket--> [ navegador: Three.js ]
   ângulos A1..A6 (graus)             1883 / 8083                          suavização + HUD
```

## Requisitos
- Node.js 20+ (testado com 24) e npm.

## Como rodar
```bash
npm install
```
Em três terminais:
```bash
npm run broker   # broker MQTT local: tcp://localhost:1883 e ws://localhost:8083
npm run plc      # simulador de CLP publicando a 20 Hz
npm run dev      # frontend em http://localhost:5173
```
Comandos úteis: `npm run typecheck`, `npm run build`.

### O que você deve ver
- O robô percorre uma rota de 5 poses, com movimento suave.
- A HUD (canto inferior esquerdo) mostra `online`, a latência da última mensagem e os ângulos.
- Parar o `plc` faz a HUD mostrar `sem dados` após 2 s. Parar o broker mostra `offline`, e o navegador reconecta sozinho.

## Armazém de tapes (`/warehouse.html`)
Segundo gêmeo digital: armazém procedural de carretéis SMD com shuttle e robô animados por pedidos de guarda e retirada.

```bash
npm run broker
npm run wms      # simulador de SGE, ORDER_INTERVAL_S (padrão 25) segundos entre pedidos
npm run dev      # http://localhost:5173/warehouse.html
```

Contrato em `shared/warehouse-protocol.ts`:

| Tópico | Direção | Payload |
|--------|---------|---------|
| `conecthus/logix/wh1/orders` | SGE → gêmeo | `{id, type: "store"\|"retrieve", address, sku?, qty?}` |
| `conecthus/logix/wh1/orders/<id>/status` | gêmeo → SGE | `{id, status: "queued"\|"running"\|"done"\|"rejected", reason?, ts}` |

Endereço no formato `A-3-2-15-7` (lado, módulo, coluna, nível, bolso). Pedidos são executados em fila, um por vez. Pedido inválido (endereço inexistente, guarda em bolso ocupado, retirada de bolso vazio) recebe `rejected` com o motivo.

O layout e o inventário ficam no `localStorage` do navegador. As dimensões padrão são estimativas (`src/warehouse/layout.ts`).

## Contrato MQTT
Definido em `shared/protocol.ts`.

| Item | Valor |
|------|-------|
| Tópico padrão | `conecthus/logix/cell1/kr120/joints` |
| Payload | JSON: `{"ts": 1790360720114, "a1": 0, "a2": 0, "a3": 0, "a4": 0, "a5": 0, "a6": 0}` |
| Unidade | graus |
| Zero | pose do arquivo do modelo (zero mecânico KUKA: braço vertical, antebraço horizontal) |
| `ts` | ms desde a época (opcional para o frontend) |

O simulador publica com `retain`, então quem conecta depois recebe a última pose imediatamente. Payloads inválidos (JSON quebrado, campos ausentes ou não numéricos) são ignorados com um aviso no console.

### Convenção de sinais
Ângulos positivos: A2 inclina o braço para a frente, A3 levanta o antebraço, A5 inclina a cabeça do punho para baixo. Os sentidos de A1, A4 e A6 foram escolhidos por convenção e **ainda não foram validados visualmente**. Conferir no modo debug.

## Configuração
Copie `.env.example` para `.env`:

| Variável | Padrão |
|----------|--------|
| `VITE_MQTT_URL` | `ws://localhost:8083` |
| `VITE_MQTT_TOPIC` | `conecthus/logix/cell1/kr120/joints` |

Simulador: `MQTT_URL` (padrão `mqtt://localhost:1883`), `MQTT_TOPIC`, `RATE_HZ`. Broker: `MQTT_TCP_PORT`, `MQTT_WS_PORT`.

Para usar o HiveMQ público, defina `VITE_MQTT_URL=wss://broker.hivemq.com:8884/mqtt` e `MQTT_URL=mqtt://broker.hivemq.com:1883`. Atenção: o broker público é aberto a qualquer pessoa. Use um tópico único e não publique nada sensível.

## Modo debug (`?debug`)
Abra `http://localhost:5173/?debug` para:
- sliders das 6 juntas (o MQTT fica desligado; use `?debug&live` para ligar os dois);
- "colorir por grupo", que pinta cada malha com a cor da junta a que pertence;
- clique numa malha para ver o nome do nó e o grupo;
- `rig.setAngle('A2', 30)` no console do navegador.

## Como o modelo é mapeado
O `scene.gltf` **não tem hierarquia de juntas**: são ~156 malhas soltas, sem nós A1 a A6. Por isso, `src/robot.ts` monta a cadeia A1→A6 em runtime e move cada malha para o grupo da sua junta com `attach()`, que preserva a posição no mundo.

Tudo que se ajusta está em `src/jointConfig.ts`:
- `JOINTS`: pivô, eixo, sentido (`sign`) e limites de cada junta.
- `classify()`: regra inicial que agrupa as malhas pela posição do centro da bounding box.
- `OVERRIDES`: exceções por nome de nó. Os nomes vêm **sanitizados pelo GLTFLoader** (`Cylinder.019_30` vira `Cylinder019_30`).

Fluxo para corrigir uma malha no grupo errado: `?debug` → colorir por grupo → clicar na malha → anotar o nome → adicionar em `OVERRIDES`.

`tools/bbox.mjs` imprime a bounding box em mundo de cada malha (`node tools/bbox.mjs`), útil para achar pivôs.

## Estrutura
```
public/models/   modelo glTF (scene.gltf + scene.bin)
shared/          contrato MQTT usado pelo simulador e pelo frontend
simulator/       broker.ts (aedes) e plc.ts (simulador de CLP)
src/             main.ts (cena), robot.ts, jointConfig.ts, telemetry.ts,
                 smoothing.ts, hud.ts, debugPanel.ts
.specs/          plano e achados sobre o modelo
tools/           utilitários de análise do modelo
```

## Limitações conhecidas
- Os cabos (`BezierCurve.*`) são rígidos e atravessam a geometria quando o braço se move.
- Os limites das juntas em `jointConfig.ts` são provisórios, principalmente A2 e A3. Validar contra o datasheet do KR120 R2700.
- O agrupamento das malhas foi proposto por geometria e revisado só parcialmente.
- Não há autenticação, TLS nem ACL no broker local. É apenas para desenvolvimento.
- Sem testes automatizados; a validação foi feita manualmente no navegador.

## Evolução para o ambiente real
Notas de direção, ainda não implementadas:

- **Unified Namespace / Sparkplug B.** Sparkplug B usa tópicos `spBv1.0/<grupo>/<tipo>/<nó>/<dispositivo>` (`NBIRTH`, `DBIRTH`, `DDATA`, `DDEATH`) e payload em Protobuf, não JSON. O ponto de troca é `src/telemetry.ts` (`parseJoints`) e o `plc.ts`. A biblioteca `tahu`/`sparkplug-payload` cuida da codificação. Vale usar o estado `BIRTH`/`DEATH` para substituir a heurística de "sem dados" da HUD.
- **CLP e OPC UA.** O CLP real não fala MQTT. O caminho típico é OPC UA → Node-RED (nó de OPC UA) → broker MQTT, convertendo para o contrato acima ou para Sparkplug B. O simulador `plc.ts` já faz o papel do Node-RED nessa cadeia.
- **Broker.** Trocar o aedes por um broker de produção (Mosquitto, EMQX, HiveMQ) com TLS, autenticação e ACL por tópico.
- **Modelo.** Com o CAD final, o ideal é exportar já com hierarquia de juntas. Isso elimina o mapeamento manual de `jointConfig.ts`, e `getObjectByName` passa a bastar.
- **Escala.** Para várias máquinas, um objeto de robô por máquina e um tópico por dispositivo, com o tópico configurável em vez de uma constante.

## Créditos
Modelo 3D: This work is based on "Kuka Robot Arm kr120 r2700 extra f" (https://sketchfab.com/3d-models/kuka-robot-arm-kr120-r2700-extra-f-335469d9c8124b91b21ae1c582287e06) by Odvokara (https://sketchfab.com/Odvokara) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).
