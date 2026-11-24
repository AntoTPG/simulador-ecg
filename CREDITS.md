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

## ECG, patologías y corazón 3D
- Explicaciones de las patologías de **elaboración propia**, redactadas con palabras propias; los trazados los genera el modelo (simplificados). Para contrastar: Manual MSD (versión para profesionales), «Electrocardiografía»: https://www.msdmanuals.com/es/professional/trastornos-cardiovasculares/pruebas-y-procedimientos-cardiovasculares/electrocardiograf%C3%ADa
- Segmentación del ventrículo izquierdo: Cerqueira MD et al. Standardized myocardial segmentation and nomenclature for tomographic imaging of the heart (AHA). *Circulation*, 2002.
- «Adivina el ECG»: preguntas generadas con el propio simulador; no usa ECG reales de terceros.

## Ciclo cardíaco (diagrama de Wiggers)
- Modelo hemodinámico de elaboración propia, simplificado (Frank‑Starling, Windkessel, acoplamiento electromecánico, patada auricular). Valores orientativos.

## Bucle presión‑volumen
- Suga H, Sagawa K, Shoukas AA. Load independence of the instantaneous pressure‑volume ratio of the canine left ventricle and effects of epinephrine and heart rate on the ratio. Circ Res, 1973. (Elastancia telesistólica.)
- Sunagawa K, Maughan WL, Burkhoff D, Sagawa K. Left ventricular interaction with arterial load studied in isolated canine ventricle. Am J Physiol, 1983. (Elastancia arterial efectiva, Ea.)
- Valores de referencia orientativos; textos y modelo de elaboración propia, simplificados.

## Respiratorio
- West JB, Luks AM. *Fisiología respiratoria. Fundamentos* (mecánica, presiones y volúmenes de referencia).
- West JB. *Fisiopatología pulmonar* (enfermedades obstructivas y restrictivas).
- Manual MSD (versión para profesionales): «Asma», «Enfermedad pulmonar obstructiva crónica», «Fibrosis pulmonar idiopática», «Síndrome de obesidad‑hipoventilación» y «Generalidades sobre las pruebas de función pulmonar».
- Espirometría: García‑Río F et al. Normativa SEPAR de espirometría. Arch Bronconeumol, 2013; Graham BL et al. Standardization of spirometry 2019 update (ATS/ERS); Stanojevic S et al. ERS/ATS technical standard on interpretive strategies for routine lung function tests, 2022; Pellegrino R et al. Interpretative strategies for lung function tests (ATS/ERS), 2005; GOLD (EPOC).
- Los valores «teóricos» de la espirometría son los del sujeto sano del modelo, no ecuaciones de referencia (GLI).
- Gasometría: Manual MSD (versión para profesionales), «Regulación del equilibrio ácido‑base», «Acidosis metabólica», «Alcalosis metabólica», «Acidosis respiratoria», «Alcalosis respiratoria»; West JB (gradiente A‑a). Casos clínicos de elaboración propia.
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

## Bibliotecas de código
React, three.js, @react-three/fiber, @react-three/drei, Zustand, Zod y sus dependencias (84 paquetes): licencias permisivas **MIT, ISC, BSD‑3‑Clause y Apache‑2.0**, todas compatibles con este uso. Sus avisos de copyright y textos de licencia se publican junto a la web en `public/LICENCIAS-TERCEROS.txt` (se regenera con `npm run licencias` y antes de cada build). Herramientas de desarrollo (no van en la web): Vite, Vitest, TypeScript, vite-plugin-pwa.

## Iconos, tipografía e imágenes
- Iconos de la app y logotipo: de elaboración propia (`scripts/make-icons.mjs`).
- Tipografía: la del sistema del usuario (no se descargan fuentes externas).
- Esquemas (congénitas, pared arterial, acino 3D, gráficas): dibujados por código, de elaboración propia. No se usan imágenes de libros ni de otras webs.

## Material promocional (fuera de la web)
- Vídeo de presentación: música «Business Technology No Copyright», de MiroMaxMusic (compositor: Maksym Myroniuk), en Pixabay, con la Pixabay Content License (uso gratuito, también comercial, sin atribución obligatoria; sin Content ID a fecha de descarga). https://pixabay.com/music/corporate-business-technology-no-copyright-636611/
- Las entidades y guías citadas (Manual MSD, SEPAR, ATS/ERS, GOLD…) se nombran solo como fuentes; no hay relación ni respaldo por su parte.
