import type { TranslationKey } from './en';

const fr: Record<TranslationKey, string> = {
  'app.subtitle': 'Surface Neurale',
  'app.parameters': 'Paramètres',
  'app.reset': 'Réinitialiser',
  'app.swipeDown': 'Glisser vers le Bas',
  'app.swipeUp': 'Glisser vers le Haut',
  'app.awaitingInput': 'En Attente d\'Entrée',

  'rotate.title': 'Veuillez Tourner Votre Appareil',
  'rotate.description': 'LithoApp est optimisée pour le mode portrait sur les appareils mobiles pour la meilleure expérience 3D.',

  'mode.label': 'Mode de Génération',
  'mode.lithophane': 'Lithophanie',
  'mode.extrusion': 'Extrusion de Logo',

  'upload.label': 'Image Source',
  'upload.replace': 'Remplacer l\'Image',
  'upload.dropHere': 'Déposez l\'Image Ici',
  'upload.tapOrDrop': 'Appuyez ou Déposez une Image',

  'tab.image': 'Image',
  'tab.geometry': 'Géométrie',
  'tab.frame': 'Cadre',

  'image.threshold': 'Seuil d\'Extrusion',
  'image.thresholdHint': 'Les pixels plus sombres que cette valeur seront extrudés à l\'épaisseur maximale.',
  'image.contrast': 'Contraste',
  'image.brightness': 'Luminosité',
  'image.edgeEnhancement': 'Amélioration des Bords',
  'image.edgeHint': 'Augmente le contraste local pour préserver les détails fins lors de l\'impression 3D.',
  'image.invertDepth': 'Inverser la Polarité de Profondeur',

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

  'geo.shape': 'Forme',
  'geo.flat': 'Plat',
  'geo.arc': 'Arc',
  'geo.cylinder': 'Cylindre',
  'geo.sphere': 'Sphère',
  'geo.heart': 'Cœur',
  'geo.maxDimension': 'Dimension Maximale',
  'geo.meshDensity': 'Densité du Maillage (LOD)',
  'geo.baseThickness': 'Épaisseur de Base (Z-min)',
  'geo.maxThickness': 'Épaisseur Maximale (Z-max)',
  'geo.smoothing': 'Lissage Laplacien',
  'geo.smoothingUnit': 'iter',

  'frame.borderWidth': 'Largeur de la Bordure',
  'frame.frameThickness': 'Épaisseur du Cadre',
  'frame.baseStand': 'Profondeur du Support',
  'frame.addHanger': 'Ajouter un Crochet',
  'frame.hangerHint': 'Ajoute un anneau de 5mm au centre supérieur pour accrocher facilement la lithophanie (ex. comme ornement).',
  'frame.curveAngle': 'Angle de Courbure',
  'frame.fullCylinder': 'Mode cylindre complet actif. Les bords sont soudés pour une impression 3D étanche.',

  'export.triangles': 'Triangles',
  'export.estSize': 'Taille Est.',
  'export.colorMirrored': 'Couleur (Miroir)',
  'export.colorTooltip': 'Télécharger le profil couleur (miroir à coller au dos de l\'impression)',
  'export.stlTooltip': 'Exporter en STL',
  'export.objTooltip': 'Exporter en OBJ (avec UVs)',

      'nav.preview': 'Aper�u',
  'nav.image': 'Image',
  'nav.geometry': 'G�om�trie',
  'nav.export': 'Exporter',
  'viewport.colorMap': 'Carte de Couleur',
  'lang.label': 'Langue',
};

export default fr;
