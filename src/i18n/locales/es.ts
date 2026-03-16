import type { TranslationKey } from './en';

const es: Record<TranslationKey, string> = {
  'app.subtitle': 'Superficie Neural',
  'app.parameters': 'Parámetros',
  'app.reset': 'Restablecer',
  'app.swipeDown': 'Desliza Abajo',
  'app.swipeUp': 'Desliza Arriba',
  'app.awaitingInput': 'Esperando Entrada',

  'rotate.title': 'Gira Tu Dispositivo',
  'rotate.description': 'LithoApp está optimizada para modo vertical en dispositivos móviles para la mejor experiencia de visualización 3D.',

  'mode.label': 'Modo de Generación',
  'mode.lithophane': 'Litofanía',
  'mode.extrusion': 'Extrusión de Logo',

  'upload.label': 'Imagen Fuente',
  'upload.replace': 'Reemplazar Imagen',
  'upload.dropHere': 'Suelta la Imagen Aquí',
  'upload.tapOrDrop': 'Toca o Arrastra una Imagen',

  'tab.image': 'Imagen',
  'tab.geometry': 'Geometría',
  'tab.frame': 'Marco',

  'image.threshold': 'Umbral de Extrusión',
  'image.thresholdHint': 'Los píxeles más oscuros que este valor se extruirán al grosor máximo.',
  'image.contrast': 'Contraste',
  'image.brightness': 'Brillo',
  'image.edgeEnhancement': 'Mejora de Bordes',
  'image.edgeHint': 'Aumenta el contraste local para preservar detalles finos en la impresión 3D.',
  'image.invertDepth': 'Invertir Polaridad de Profundidad',

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

  'geo.shape': 'Forma',
  'geo.flat': 'Plano',
  'geo.arc': 'Arco',
  'geo.cylinder': 'Cilindro',
  'geo.sphere': 'Esfera',
  'geo.heart': 'Corazón',
  'geo.maxDimension': 'Dimensión Máxima',
  'geo.meshDensity': 'Densidad de Malla (LOD)',
  'geo.baseThickness': 'Grosor Base (Z-min)',
  'geo.maxThickness': 'Grosor Máximo (Z-max)',
  'geo.smoothing': 'Suavizado Laplaciano',
  'geo.smoothingUnit': 'iter',

  'frame.borderWidth': 'Ancho del Borde',
  'frame.frameThickness': 'Grosor del Marco',
  'frame.baseStand': 'Profundidad del Soporte',
  'frame.addHanger': 'Añadir Gancho Superior',
  'frame.hangerHint': 'Añade un anillo de 5mm en el centro superior para colgar fácilmente la litofanía (ej. como ornamento).',
  'frame.curveAngle': 'Ángulo de Curva',
  'frame.fullCylinder': 'Modo cilindro completo activo. Los bordes están soldados para impresión 3D hermética.',

  'export.triangles': 'Triángulos',
  'export.estSize': 'Tam. Estimado',
  'export.colorMirrored': 'Color (Espejo)',
  'export.colorTooltip': 'Descargar perfil de color (espejado para pegar en el reverso de la impresión)',
  'export.stlTooltip': 'Exportar como STL',
  'export.objTooltip': 'Exportar como OBJ (con UVs)',

      'nav.preview': 'Vista Previa',
  'nav.image': 'Imagen',
  'nav.geometry': 'Geometr�a',
  'nav.export': 'Exportar',
  'viewport.colorMap': 'Mapa de Color',
  'lang.label': 'Idioma',
};

export default es;
