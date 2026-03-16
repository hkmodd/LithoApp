import type { TranslationKey } from './en';

const pt: Record<TranslationKey, string> = {
  'app.subtitle': 'Superfície Neural',
  'app.parameters': 'Parâmetros',
  'app.reset': 'Redefinir',
  'app.swipeDown': 'Deslize para Baixo',
  'app.swipeUp': 'Deslize para Cima',
  'app.awaitingInput': 'Aguardando Entrada',

  'rotate.title': 'Gire Seu Dispositivo',
  'rotate.description': 'LithoApp é otimizado para modo retrato em dispositivos móveis para a melhor experiência 3D.',

  'mode.label': 'Modo de Geração',
  'mode.lithophane': 'Litofania',
  'mode.extrusion': 'Extrusão de Logo',

  'upload.label': 'Imagem Fonte',
  'upload.replace': 'Substituir Imagem',
  'upload.dropHere': 'Solte a Imagem Aqui',
  'upload.tapOrDrop': 'Toque ou Arraste uma Imagem',

  'tab.image': 'Imagem',
  'tab.geometry': 'Geometria',
  'tab.frame': 'Moldura',

  'image.threshold': 'Limiar de Extrusão',
  'image.thresholdHint': 'Pixels mais escuros que este valor serão extrudados na espessura máxima.',
  'image.contrast': 'Contraste',
  'image.brightness': 'Brilho',
  'image.edgeEnhancement': 'Aprimoramento de Bordas',
  'image.edgeHint': 'Aumenta o contraste local para preservar detalhes finos na impressão 3D.',
  'image.invertDepth': 'Inverter Polaridade de Profundidade',

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
  'geo.heart': 'Coração',
  'geo.maxDimension': 'Dimensão Máxima',
  'geo.meshDensity': 'Densidade da Malha (LOD)',
  'geo.baseThickness': 'Espessura da Base (Z-min)',
  'geo.maxThickness': 'Espessura Máxima (Z-max)',
  'geo.smoothing': 'Suavização Laplaciana',
  'geo.smoothingUnit': 'iter',

  'frame.borderWidth': 'Largura da Borda',
  'frame.frameThickness': 'Espessura da Moldura',
  'frame.baseStand': 'Profundidade do Suporte',
  'frame.addHanger': 'Adicionar Gancho',
  'frame.hangerHint': 'Adiciona um anel de 5mm no centro superior para pendurar facilmente a litofania (ex. como ornamento).',
  'frame.curveAngle': 'Ângulo de Curva',
  'frame.fullCylinder': 'Modo cilindro completo ativo. Bordas soldadas para impressão 3D hermética.',

  'export.triangles': 'Triângulos',
  'export.estSize': 'Tam. Estimado',
  'export.colorMirrored': 'Cor (Espelho)',
  'export.colorTooltip': 'Baixar perfil de cor (espelhado para colar no verso da impressão)',
  'export.stlTooltip': 'Exportar como STL',
  'export.objTooltip': 'Exportar como OBJ (com UVs)',

      'nav.preview': 'Pr�-visualiza��o',
  'nav.image': 'Imagem',
  'nav.geometry': 'Geometria',
  'nav.export': 'Exportar',
  'viewport.colorMap': 'Mapa de Cor',
  'lang.label': 'Idioma',
};

export default pt;
