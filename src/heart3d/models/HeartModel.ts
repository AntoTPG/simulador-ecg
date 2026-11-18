/**
 * CONTRATO DE UN MODELO DE CORAZÓN
 * --------------------------------
 * La escena no sabe si el corazón es procedural o un glTF anatómico. Cualquier
 * modelo debe:
 *   1. Dibujarse en el MARCO LOCAL del corazón (ver anatomy.ts: +y base,
 *      −y ápex, +z anterior); la escena lo coloca con HEART_QUATERNION.
 *   2. Usar CLIP_PLANES en sus materiales para que funcione el corte.
 *   3. Respetar `heartOpacity` y las capas (coronarias, conducción) del store.
 *   4. (Fase 2) Exponer los territorios con los nombres de la segmentación AHA
 *      de 17 segmentos y las arterias con las claves de CORONARIES, para que
 *      las patologías puedan iluminarlos.
 *
 * Para usar un glTF: crea GltfHeart.tsx con useGLTF(), mapea los nombres de
 * malla del archivo a esas claves y cambia el componente en HeartScene.tsx.
 */
export type HeartModelKind = 'procedural' | 'gltf';
export const ACTIVE_HEART_MODEL: HeartModelKind = 'procedural';
