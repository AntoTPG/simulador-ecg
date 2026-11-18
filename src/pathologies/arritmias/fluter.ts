import { definePathology } from '../schema';

export default definePathology({
  id: 'fluter-auricular',
  nombre: 'Flúter auricular típico',
  categoria: 'Arritmias',
  explicacion: [
    'Un único macrocircuito de reentrada gira alrededor de la válvula tricúspide pasando por el istmo cavotricuspídeo, a unas 300 vueltas por minuto.',
    'Cada vuelta produce una onda F. Como el circuito asciende por el tabique interauricular, las F son negativas en II, III y aVF, con aspecto de "dientes de sierra" y sin línea isoeléctrica entre ellas.',
    'El nodo AV no puede conducir a 300/min: lo más típico es la conducción 2:1 (FC ~150 lpm, muy regular). Ante una taquicardia regular a 150, piensa en flúter y busca la segunda F escondida en el QRS o la T.',
    'Con conducción 4:1 los dientes de sierra se ven claramente. Tratamiento definitivo: ablación del istmo cavotricuspídeo.',
  ],
  derivacionesAfectadas: ['II', 'III', 'aVF', 'V1'],
  territorio3D: { estructuras: ['auriculas'] },
  control: {
    tipo: 'gravedad',
    etiqueta: 'Conducción AV',
    inicial: 1,
    niveles: [
      { id: '2-1', etiqueta: '2:1', detalle: 'FC 150 lpm', modificaciones: { ritmo: { tipo: 'fluter', conduccion: 2 } } },
      { id: '4-1', etiqueta: '4:1', detalle: 'FC 75 lpm', modificaciones: { ritmo: { tipo: 'fluter', conduccion: 4 } } },
      { id: 'variable', etiqueta: 'Variable', detalle: 'RR irregular', modificaciones: { ritmo: { tipo: 'fluter', conduccion: 'variable' } } },
    ],
  },
});
