import type { TranslationKey } from './en';

const it: Record<TranslationKey, string> = {
  'app.subtitle': 'Superficie Neurale',
  'app.parameters': 'Parametri',
  'app.reset': 'Ripristina',
  'app.swipeDown': 'Scorri Giù',
  'app.swipeUp': 'Scorri Su',
  'app.awaitingInput': 'In Attesa di Input',

  'rotate.title': 'Ruota il Tuo Dispositivo',
  'rotate.description': 'LithoApp è ottimizzata per la modalità verticale sui dispositivi mobili per la migliore esperienza di visualizzazione 3D.',

  'mode.label': 'Modalità di Generazione',
  'mode.lithophane': 'Litofania',
  'mode.extrusion': 'Estrusione Logo',

  'upload.label': 'Immagine Sorgente',
  'upload.replace': 'Sostituisci Immagine',
  'upload.dropHere': 'Rilascia l\'Immagine Qui',
  'upload.tapOrDrop': 'Tocca o Trascina un\'Immagine',

  'tab.image': 'Immagine',
  'tab.geometry': 'Geometria',
  'tab.frame': 'Cornice',

  'image.threshold': 'Soglia Estrusione',
  'image.thresholdHint': 'I pixel più scuri di questo valore verranno estrusi allo spessore massimo.',
  'image.contrast': 'Contrasto',
  'image.brightness': 'Luminosità',
  'image.edgeEnhancement': 'Miglioramento Bordi',
  'image.edgeHint': 'Aumenta il contrasto locale per preservare i dettagli fini durante la stampa 3D.',
  'image.invertDepth': 'Inverti Polarità Profondità',

  // Image editor
  'editor.title': 'Modifica Immagine',
  'editor.rotateLeft': 'Ruota a Sinistra',
  'editor.rotateRight': 'Ruota a Destra',
  'editor.flipH': 'Specchia Orizzontale',
  'editor.flipV': 'Specchia Verticale',
  'editor.crop': 'Ritaglia',
  'editor.gamma': 'Gamma',
  'editor.exposure': 'Esposizione',
  'editor.reset': 'Annulla Modifiche',
  'editor.applyCrop': 'Applica',
  'editor.cancelCrop': 'Annulla',

  'geo.shape': 'Forma',
  'geo.flat': 'Piatto',
  'geo.arc': 'Arco',
  'geo.cylinder': 'Cilindro',
  'geo.sphere': 'Sfera',
  'geo.heart': 'Cuore',
  'geo.maxDimension': 'Dimensione Massima',
  'geo.meshDensity': 'Densità Mesh (LOD)',
  'geo.baseThickness': 'Spessore Base (Z-min)',
  'geo.maxThickness': 'Spessore Massimo (Z-max)',
  'geo.smoothing': 'Smoothing Laplaciano',
  'geo.smoothingUnit': 'iter',

  'frame.borderWidth': 'Larghezza Bordo Cornice',
  'frame.frameThickness': 'Spessore Cornice',
  'frame.baseStand': 'Profondità Supporto Base',
  'frame.addHanger': 'Aggiungi Gancio Superiore',
  'frame.hangerHint': 'Aggiunge un anello di 5mm al centro superiore per appendere facilmente la litofania (es. come ornamento).',
  'frame.curveAngle': 'Angolo Curva',
  'frame.fullCylinder': 'Modalità cilindro completo attiva. I bordi sono saldati per una stampa 3D a tenuta stagna.',

  'export.triangles': 'Triangoli',
  'export.estSize': 'Dim. Stimata',
  'export.colorMirrored': 'Colore (Specchiato)',
  'export.colorTooltip': 'Scarica profilo colore (specchiato da incollare sul retro della stampa)',
  'export.stlTooltip': 'Esporta come STL',
  'export.objTooltip': 'Esporta come OBJ (con UV)',

      'nav.preview': 'Anteprima',
  'nav.image': 'Immagine',
  'nav.geometry': 'Geometria',
  'nav.export': 'Esporta',
  'viewport.colorMap': 'Mappa Colore',
  'lang.label': 'Lingua',
};

export default it;
