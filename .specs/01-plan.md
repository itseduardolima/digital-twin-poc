# Plano da PoC: Digital Twin KR120 (Three.js + MQTT)

Cada fase termina com algo que se pode ver rodando. SÃ³ passamos para a prÃ³xima com aprovaÃ§Ã£o.

## Estado atual
- [x] Pasta do projeto, dependÃªncias instaladas (three, mqtt, vite, typescript, tsx, aedes, ws)
- [x] Modelo copiado para `public/models/`
- [x] AnÃ¡lise da estrutura do modelo (ver `00-model-findings.md`)
- [x] Fase 1 concluÃ­da: Vite + TS, cena, luzes, cÃ¢mera orbital, robÃ´ carregado (`src/main.ts`). Typecheck e build OK, confirmado no navegador (pose de zero mecÃ¢nico, como previsto)
- [~] Fase 2 em andamento: cadeia A1-A6, config, painel debug e primeira classificaÃ§Ã£o prontos. Falta a revisÃ£o visual do usuÃ¡rio (sinais e malhas mal agrupadas)
- [ ] Fases 3 a 5: nÃ£o iniciadas

## Fase 1: Esqueleto Vite + TS + cena
- `index.html`, `vite.config.ts`, `tsconfig.json`, scripts do `package.json`
- Cena, luzes, cÃ¢mera orbital, chÃ£o/grade
- Carregar `scene.gltf` e enquadrar a cÃ¢mera
- **Entrega:** abrir `npm run dev` e ver o robÃ´ parado.

## Fase 2: Mapeamento das juntas
- Tabela em `src/jointConfig.ts`: para cada A1..A6 â†’ pivÃ´, eixo, sinal, limites, lista de malhas.
- Montar a cadeia cinemÃ¡tica em runtime (grupo por junta, aninhados) com `attach()`.
- Modo debug `?debug`: colore por grupo, clique mostra o nome da malha, sliders A1..A6 para testar Ã  mÃ£o.
- Iterar visualmente atÃ© cada junta girar certo.
- **Entrega:** sliders movendo o robÃ´ de forma coerente.

## Fase 3: Simulador de CLP (Node)
- Broker MQTT local (aedes, TCP + WebSocket) e script `simulator/plc.ts`.
- Publica JSON periÃ³dico com A1..A6 interpolando entre poses.
- **Entrega:** `mosquitto_sub`/log mostrando as mensagens.

## Fase 4: IntegraÃ§Ã£o MQTT no navegador
- `mqtt.js` via WebSocket, subscriÃ§Ã£o, parse e validaÃ§Ã£o do payload.
- SuavizaÃ§Ã£o (damping independente de framerate).
- HUD: estado da conexÃ£o, Ã¢ngulos, idade da Ãºltima mensagem, aviso de dados obsoletos.
- Broker configurÃ¡vel por `.env` (local por padrÃ£o, HiveMQ pÃºblico opcional).
- **Entrega:** simulador rodando e o robÃ´ no navegador se movendo.

## Fase 5: Acabamento e documentaÃ§Ã£o
- README com como rodar, contrato do tÃ³pico/payload, como remapear juntas.
- Notas de evoluÃ§Ã£o para Sparkplug B / OPC UA / Node-RED.

## DecisÃµes tomadas
- Frontend: Three.js puro + Vite + TypeScript
- Broker padrÃ£o: local (aedes), HiveMQ pÃºblico opcional via `.env`
- Mapeamento: semi-automÃ¡tico (proposta por geometria) + confirmaÃ§Ã£o no modo debug
- Payload: JSON com Ã¢ngulos em graus, zero = pose do arquivo (zero mecÃ¢nico)

## Ainda em aberto (perguntar na fase correspondente)
- Sentido positivo de cada junta e limites (Fase 2)
- Nome do tÃ³pico (Fase 3)

