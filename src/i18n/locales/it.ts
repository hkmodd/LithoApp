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
  'viewport.heatmap': 'Thickness Heatmap',
  'lang.label': 'Lingua',

  // Slicer tips
  'slicer.title': 'Consigli Slicer',
  'slicer.layerHeight': 'Altezza Layer',
  'slicer.infill': 'Riempimento',
  'slicer.orientation': 'Orientamento',
  'slicer.supports': 'Supporti',

  // New shapes
  'geo.lampshade': 'Paralume',
  'geo.vase': 'Vaso',
  'geo.dome': 'Cupola',

  // Preset gallery
  'preset.label': 'Preset',
  'preset.default': 'Predefinito',
  'preset.highDetail': 'Alta Definiz.',
  'preset.vintage': 'Vintage',
  'preset.softGlow': 'Sfumato',
  'preset.dramatic': 'Drammatico',
  'preset.nightLight': 'Lampada Not.',
  'preset.inverted': 'Invertito',
  'preset.bold': 'Forte',

  // Color lithophane
  'mode.colorLitho': 'Litofania Colore',
  'tab.color': 'Colore',
  'color.title': 'Canali CMYW',
  'color.info': 'Genera 5 piastre separate (C, M, Y, K, W) per stampa multi-colore su filamento trasparente.',
  'color.channel': 'Canale anteprima',
  'color.composite': 'Composito',
  'color.cyan': 'Ciano',
  'color.magenta': 'Magenta',
  'color.yellow': 'Giallo',
  'color.white': 'Bianco',
  'color.channelStats': 'Statistiche Canale',
  'color.vertices': 'Vertici',
  'color.exportAll': 'Esporta tutte le piastre (ZIP)',
  'color.exportChannel': 'Esporta canale STL',
  'color.registrationPins': 'Pin di allineamento',
  'color.registrationHint': 'Aggiunge pin/fori per un preciso allineamento dei livelli.',
  'color.plateGap': 'Distanza tra le piastre',

  // Update toast
  'update.available': 'Nuova versione disponibile',
  'update.hint': 'Aggiorna per le ultime novità',
  'update.action': 'Aggiorna',

  // PWA Install prompt
  'install.title': 'Installa LithoApp',
  'install.subtitle': 'Esperienza nativa completa — più veloce, disponibile offline.',
  'install.fast': 'Avvio istantaneo',
  'install.offline': 'Funziona offline',
  'install.native': 'Esperienza nativa',
  'install.cta': 'Installa App',
  'install.howto': 'Come Installare',
  'install.ios.step1': 'Tocca il pulsante Condividi (barra inferiore)',
  'install.ios.step2': 'Tocca "Aggiungi a Home"',
  'install.android.step1': 'Tocca il Menu (⋮)',
  'install.android.step2': 'Tocca "Aggiungi a Home"',
  'install.gotit': 'Capito',
};

export default it;
