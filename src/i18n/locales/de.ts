import type { TranslationKey } from './en';

const de: Record<TranslationKey, string> = {
  'app.subtitle': 'Neurale Oberfläche',
  'app.parameters': 'Parameter',
  'app.reset': 'Zurücksetzen',
  'app.swipeDown': 'Nach Unten Wischen',
  'app.swipeUp': 'Nach Oben Wischen',
  'app.awaitingInput': 'Warte auf Eingabe',

  'rotate.title': 'Bitte Gerät Drehen',
  'rotate.description': 'LithoApp ist für den Hochformatmodus auf Mobilgeräten optimiert für das beste 3D-Erlebnis.',

  'mode.label': 'Generierungsmodus',
  'mode.lithophane': 'Lithophanie',
  'mode.extrusion': 'Logo-Extrusion',

  'upload.label': 'Quellbild',
  'upload.replace': 'Bild Ersetzen',
  'upload.dropHere': 'Bild Hier Ablegen',
  'upload.tapOrDrop': 'Tippen oder Bild Ablegen',

  'tab.image': 'Bild',
  'tab.geometry': 'Geometrie',
  'tab.frame': 'Rahmen',

  'image.threshold': 'Extrusionsschwelle',
  'image.thresholdHint': 'Pixel dunkler als dieser Wert werden auf maximale Dicke extrudiert.',
  'image.contrast': 'Kontrast',
  'image.brightness': 'Helligkeit',
  'image.edgeEnhancement': 'Kantenverbesserung',
  'image.edgeHint': 'Erhöht den lokalen Kontrast, um feine Details beim 3D-Druck zu bewahren.',
  'image.invertDepth': 'Tiefenpolarität Umkehren',

  // Image editor (English fallback)
  'editor.title': 'Edit Image',
  'editor.rotateLeft': 'Rotate Left',
  'editor.rotateRight': 'Rotate Right',
  'editor.flipH': 'Flip Horizontal',
  'editor.flipV': 'Flip Vertical',
  'editor.crop': 'Crop',
  'editor.gamma': 'Gamma',
  'editor.exposure': 'Exposure',
  'editor.reset': 'Reset Edits',
  'editor.applyCrop': 'Apply Crop',
  'editor.cancelCrop': 'Cancel',

  'geo.shape': 'Form',
  'geo.flat': 'Flach',
  'geo.arc': 'Bogen',
  'geo.cylinder': 'Zylinder',
  'geo.sphere': 'Kugel',
  'geo.heart': 'Herz',
  'geo.maxDimension': 'Maximale Dimension',
  'geo.meshDensity': 'Netzdichte (LOD)',
  'geo.baseThickness': 'Basisdicke (Z-min)',
  'geo.maxThickness': 'Maximale Dicke (Z-max)',
  'geo.smoothing': 'Laplace-Glättung',
  'geo.smoothingUnit': 'Iter',

  'frame.borderWidth': 'Rahmenbreite',
  'frame.frameThickness': 'Rahmendicke',
  'frame.baseStand': 'Standtiefe',
  'frame.addHanger': 'Aufhängung Hinzufügen',
  'frame.hangerHint': 'Fügt einen 5mm-Ring oben in der Mitte hinzu, um die Lithophanie einfach aufzuhängen (z.B. als Ornament).',
  'frame.curveAngle': 'Kurvenwinkel',
  'frame.fullCylinder': 'Vollzylindermodus aktiv. Kanten sind verschweißt für wasserdichten 3D-Druck.',

  'export.triangles': 'Dreiecke',
  'export.estSize': 'Gesch. Größe',
  'export.colorMirrored': 'Farbe (Gespiegelt)',
  'export.colorTooltip': 'Farbprofil herunterladen (gespiegelt zum Aufkleben auf die Rückseite)',
  'export.stlTooltip': 'Als STL Exportieren',
  'export.objTooltip': 'Als OBJ Exportieren (mit UVs)',

      'nav.preview': 'Vorschau',
  'nav.image': 'Bild',
  'nav.geometry': 'Geometrie',
  'nav.export': 'Export',
  'viewport.colorMap': 'Farbkarte',
  'lang.label': 'Sprache',
  // Slicer tips
  'slicer.title': 'Slicer Tips',
  'slicer.layerHeight': 'Layer Height',
  'slicer.infill': 'Infill',
  'slicer.orientation': 'Orientation',
  'slicer.supports': 'Supports',

  // New shapes
  'geo.lampshade': 'Lampshade',
  'geo.vase': 'Vase',
  'geo.dome': 'Dome',
  // Preset gallery
  'preset.label': 'Presets',
  'preset.default': 'Default',
  'preset.highDetail': 'High Detail',
  'preset.vintage': 'Vintage',
  'preset.softGlow': 'Soft Glow',
  'preset.dramatic': 'Dramatic',
  'preset.nightLight': 'Night Light',
  'preset.inverted': 'Inverted',
  'preset.bold': 'Bold',
};

export default de;
