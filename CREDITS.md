# Créditos y referencias

## Modelo 3D
- Corazón estilizado **procedural**, generado por código (`src/heart3d/models/`). No usa recursos externos.
- **Modelos externos evaluados (no incluidos):**
  - «Human Heart 3d Model» de Sourav Pan (Biology Notes Online), en NIH 3D Print Exchange, 3DPX‑022787, **dominio público**: https://3d.nih.gov/entries/22787. Está descartado porque es muy esquemático (sin cavidades ni territorios) y perderíamos el mapa de activación y los segmentos AHA, que dependen de la geometría propia.
  - BodyParts3D y Z‑Anatomy tienen licencia CC BY‑SA: son rigurosos, pero obligan a redistribuir el modelo con la misma licencia y su malla es muy pesada para el móvil.
  - Para cambiar de modelo, ver `src/heart3d/models/HeartModel.ts`.

## Referencias del modelo eléctrico
- Einthoven W. *Le télécardiogramme*. Arch Int Physiol, 1906. (Triángulo de Einthoven.)
- Goldberger E. A simple, indifferent, electrocardiographic electrode of zero potential… Am Heart J, 1942. (Derivaciones aumentadas.)
- Wilson FN et al. Electrocardiograms that represent the potential variations of a single electrode. Am Heart J, 1934. (Terminal central.)
- Dower GE et al. On deriving the electrocardiogram from vectorcardiographic leads. Clin Cardiol, 1980. (Matriz inversa de Dower.)
- Frank E. An accurate, clinically practical system for spatial vectorcardiography. Circulation, 1956.

## Bucle presión‑volumen
- Suga H, Sagawa K, Shoukas AA. Load independence of the instantaneous pressure‑volume ratio of the canine left ventricle and effects of epinephrine and heart rate on the ratio. Circ Res, 1973. (Elastancia telesistólica.)
- Sunagawa K, Maughan WL, Burkhoff D, Sagawa K. Left ventricular interaction with arterial load studied in isolated canine ventricle. Am J Physiol, 1983. (Elastancia arterial efectiva, Ea.)
- Valores de referencia orientativos; textos y modelo de elaboración propia, simplificados.

## Respiratorio
- West JB, Luks AM. *Fisiología respiratoria. Fundamentos* (mecánica, presiones y volúmenes de referencia).
- West JB. *Fisiopatología pulmonar* (enfermedades obstructivas y restrictivas).
- Manual MSD (versión para profesionales): «Asma», «Enfermedad pulmonar obstructiva crónica», «Fibrosis pulmonar idiopática», «Síndrome de obesidad‑hipoventilación» y «Generalidades sobre las pruebas de función pulmonar».
- Modelo y acino 3D de elaboración propia, simplificados y no a escala; valores orientativos.

## Ruidos cardíacos
- Explicaciones elaboradas a partir del **Manual MSD** (versión para profesionales), «Auscultación cardíaca» (Gupta J. I., Shea M. J., rev. abr. 2025): https://www.msdmanuals.com/es/professional/trastornos-cardiovasculares/abordaje-del-paciente-card%C3%ADaco/auscultaci%C3%B3n-card%C3%ADaca
- **Grabaciones reales y esquemas** (incluidos en `public/audio/michigan/`): Judge R., Mangrulkar R. *Heart Sound and Murmur Library*. University of Michigan Medical School / Open.Michigan, 2015. Licencia **CC BY‑SA 4.0**: https://hdl.handle.net/2027.42/120554. Los MP3 están recortados a 30 s y recodificados a 64 kbps; los esquemas, sin cambios. Estos archivos se redistribuyen con la misma licencia (ver `public/audio/michigan/LICENCIA.txt`).
- El botón «Escuchar» reproduce un sonido sintetizado a partir del modelo hemodinámico propio, sincronizado con la animación.

## Cardiopatías congénitas
- Contenido elaborado a partir del **Manual MSD** (versión para profesionales), Pediatría › «Anomalías cardiovasculares congénitas»: https://www.msdmanuals.com/es/professional/pediatr%C3%ADa/anomal%C3%ADas-cardiovasculares-cong%C3%A9nitas
- Saturaciones y presiones: valores típicos de libro, orientativos. Esquemas de elaboración propia.

## Pared arterial
- Histología normal: Ross MH, Pawlina W. *Histología* (sistema cardiovascular).
- Patología: Manual MSD (versión para profesionales), «Arteriosclerosis no ateromatosa», «Generalidades sobre los aneurismas aórticos», «Aneurismas de la aorta torácica» y capítulos de aterosclerosis, disección aórtica, vasculitis y sífilis.
- Esquemas de elaboración propia, simplificados y no a escala.

## Bibliotecas
React, three.js, @react-three/fiber, @react-three/drei, Zustand, Zod, Vite y Vitest. Todas tienen licencia MIT.
