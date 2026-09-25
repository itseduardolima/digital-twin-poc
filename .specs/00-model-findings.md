# Achados sobre o modelo KUKA KR120 (scene.gltf)

Origem: `C:\Users\Eduardo\Downloads\kuka_robot_arm_kr120_r2700_extra_f\` (copiado para `public/models/`).

## Formato
- glTF separado: `scene.gltf` (298 KB) + `ene.bin` (11 MB, renomeado para `scene.bin` na cópia, com a URI ajustada) + `license.txt`.
- Não é `.glb`. Isso funciona com o `GLTFLoader`, desde que o `.bin` fique na mesma pasta.

## Estrutura (diferente do que se assumia)
- **NÃO existe hierarquia de juntas.** Não há nós A1..A6 nem Base.
- São ~156 nós de malha, todos irmãos sob `GLTF_SceneRootNode`, com nomes do Blender (`Cylinder.002_4`, `Cube_22`...).
- Nenhum nó tem rotação nem translação própria. Só há `matrix` nos 3 nós do topo.
- Consequência: `getObjectByName('A1')` não funciona. Cada malha precisa ser agrupada por junta manualmente ou por regra, e o pivô de cada junta precisa ser definido por nós.

## Pose do arquivo
- Pose = zero mecânico da KUKA (braço vertical, antebraço horizontal apontando para -X, plano do braço ≈ XY, Y para cima).
- Se todos os ângulos = 0 correspondem a essa pose, o mapeamento fica simples.

## Pivôs estimados (espaço do mundo, depois das matrizes; a confirmar visualmente)
| Junta | Eixo | Pivô aprox. (x, y, z) | Como foi estimado |
|-------|------|-----------------------|-------------------|
| A1 | Y | (-0.47, *, 0) | centro do cilindro da base |
| A2 | Z | (-0.86, 2.29, ·) | anel de parafusos do ombro |
| A3 | Z | (-0.80, 5.98, ·) | anel de parafusos do cotovelo |
| A4 | X | (·, 6.38, 0.06) | anel de parafusos do punho |
| A5 | Z | (-4.85, 6.38, 0.06) | carcaça do punho |
| A6 | X | (-5.4, 6.39, 0.07) | discos do flange |

## Riscos
- Agrupar ~156 malhas em 6 juntas é a parte mais trabalhosa e exige ajuste visual.
- O cabo (`BezierCurve.*`) é rígido e vai atravessar a geometria quando o braço se mover. É aceitável na PoC.
- Sentido positivo de cada junta e limites reais do KR120 precisam ser definidos (ver plano).
- `tools/bbox.mjs` calcula as bounding boxes em mundo de cada malha.
