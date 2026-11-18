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

## Bibliotecas
React, three.js, @react-three/fiber, @react-three/drei, Zustand, Zod, Vite y Vitest. Todas tienen licencia MIT.
