# Plano da PoC: Digital Twin KR120 (Three.js + MQTT)

Cada fase termina com algo que se pode ver rodando. Só passamos para a próxima com aprovação.

## Estado atual
- [x] Pasta do projeto, dependências instaladas (three, mqtt, vite, typescript, tsx, aedes, ws)
- [x] Modelo copiado para `public/models/`
- [x] Análise da estrutura do modelo (ver `00-model-findings.md`)
- [x] Fase 1 concluída: Vite + TS, cena, luzes, câmera orbital, robô carregado (`src/main.ts`). Typecheck e build OK, confirmado no navegador (pose de zero mecânico, como previsto)
- [~] Fase 2 em andamento: cadeia A1-A6, config, painel debug e primeira classificação prontos. Falta a revisão visual do usuário (sinais e malhas mal agrupadas)
- [x] Fase 3 concluída: broker aedes (tcp 1883, ws 8083) e simulador de CLP (`npm run broker` / `npm run plc`). Verificado por TCP e WebSocket
- [x] Fase 4 concluída: `src/telemetry.ts`, `src/smoothing.ts`, `src/hud.ts`, `.env.example`. Verificado no navegador (online, offline, reconexão, sem dados). Em `?debug` o MQTT fica desligado; use `?debug&live`
- [x] Fase 5 concluída: README com execução, contrato MQTT, mapeamento das juntas, limitações, notas de evolução e crédito CC-BY do modelo

## Fase 1: Esqueleto Vite + TS + cena
- `index.html`, `vite.config.ts`, `tsconfig.json`, scripts do `package.json`
- Cena, luzes, câmera orbital, chão/grade
- Carregar `scene.gltf` e enquadrar a câmera
- **Entrega:** abrir `npm run dev` e ver o robô parado.

## Fase 2: Mapeamento das juntas
- Tabela em `src/jointConfig.ts`: para cada A1..A6 → pivô, eixo, sinal, limites, lista de malhas.
- Montar a cadeia cinemática em runtime (grupo por junta, aninhados) com `attach()`.
- Modo debug `?debug`: colore por grupo, clique mostra o nome da malha, sliders A1..A6 para testar à mão.
- Iterar visualmente até cada junta girar certo.
- **Entrega:** sliders movendo o robô de forma coerente.

## Fase 3: Simulador de CLP (Node)
- Broker MQTT local (aedes, TCP + WebSocket) e script `simulator/plc.ts`.
- Publica JSON periódico com A1..A6 interpolando entre poses.
- **Entrega:** `mosquitto_sub`/log mostrando as mensagens.

## Fase 4: Integração MQTT no navegador
- `mqtt.js` via WebSocket, subscrição, parse e validação do payload.
- Suavização (damping independente de framerate).
- HUD: estado da conexão, ângulos, idade da última mensagem, aviso de dados obsoletos.
- Broker configurável por `.env` (local por padrão, HiveMQ público opcional).
- **Entrega:** simulador rodando e o robô no navegador se movendo.

## Fase 5: Acabamento e documentação
- README com como rodar, contrato do tópico/payload, como remapear juntas.
- Notas de evolução para Sparkplug B / OPC UA / Node-RED.

## Decisões tomadas
- Frontend: Three.js puro + Vite + TypeScript
- Broker padrão: local (aedes), HiveMQ público opcional via `.env`
- Mapeamento: semi-automático (proposta por geometria) + confirmação no modo debug
- Payload: JSON com ângulos em graus, zero = pose do arquivo (zero mecânico)

## Ainda em aberto (perguntar na fase correspondente)
- Sentido positivo de cada junta e limites (Fase 2)
- (resolvido) Tópico: `conecthus/logix/cell1/kr120/joints`, payload `{a1..a6, ts}` em graus, ver `shared/protocol.ts`


