const en = {
  // App chrome
  'app.subtitle': 'Neural Surface',
  'app.parameters': 'Parameters',
  'app.reset': 'Reset',
  'app.swipeDown': 'Swipe Down',
  'app.swipeUp': 'Swipe Up',
  'app.awaitingInput': 'Awaiting Neural Input',

  // Rotate overlay
  'rotate.title': 'Please Rotate Your Device',
  'rotate.description': 'LithoApp is optimized for portrait mode on mobile devices to provide the best 3D viewing experience.',

  // Mode switcher
  'mode.label': 'Generation Mode',
  'mode.lithophane': 'Lithophane',
  'mode.extrusion': 'Logo Extrusion',

  // Upload
  'upload.label': 'Source Asset',
  'upload.replace': 'Replace Asset',
  'upload.dropHere': 'Drop Image Here',
  'upload.tapOrDrop': 'Tap or Drop Image Here',

  // Tabs
  'tab.image': 'Image',
  'tab.geometry': 'Geometry',
  'tab.frame': 'Frame',

  // Image tab
  'image.threshold': 'Extrusion Threshold',
  'image.thresholdHint': 'Pixels darker than this value will be extruded to max thickness.',
  'image.contrast': 'Contrast',
  'image.brightness': 'Brightness',
  'image.edgeEnhancement': 'Edge Enhancement',
  'image.edgeHint': 'Increases local contrast to preserve fine details during 3D printing.',
  'image.invertDepth': 'Invert Depth Polarity',

  // Image editor
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

  // Geometry tab
  'geo.shape': 'Shape',
  'geo.flat': 'Flat',
  'geo.arc': 'Arc',
  'geo.cylinder': 'Cylinder',
  'geo.sphere': 'Sphere',
  'geo.heart': 'Heart',
  'geo.maxDimension': 'Max Dimension',
  'geo.meshDensity': 'Mesh Density (LOD)',
  'geo.baseThickness': 'Base Thickness (Z-min)',
  'geo.maxThickness': 'Max Thickness (Z-max)',
  'geo.smoothing': 'Laplacian Smoothing',
  'geo.smoothingUnit': 'iter',

  // Frame tab
  'frame.borderWidth': 'Border Frame Width',
  'frame.frameThickness': 'Frame Thickness',
  'frame.baseStand': 'Base Stand Depth',
  'frame.addHanger': 'Add Top Hanger',
  'frame.hangerHint': 'Adds a 5mm ring at the top center to easily hang the lithophane (e.g., as an ornament).',
  'frame.curveAngle': 'Curve Angle',
  'frame.fullCylinder': 'Full cylinder mode active. Edges are welded for water-tight 3D printing.',

  // Export bar
  'export.triangles': 'Triangles',
  'export.estSize': 'Est. Size',
  'export.colorMirrored': 'Color (Mirrored)',
  'export.colorTooltip': 'Download Color Profile (Mirrored to stick on the back of the print)',
  'export.stlTooltip': 'Export as STL',
  'export.objTooltip': 'Export as OBJ (with UVs)',

  // Viewport controls
    'nav.preview': 'Preview',
  'nav.image': 'Image',
  'nav.geometry': 'Geometry',
  'nav.export': 'Export',
  'viewport.colorMap': 'Color Map',

  // Language selector
  'lang.label': 'Language',
} as const;

export type TranslationKey = keyof typeof en;
export default en;
