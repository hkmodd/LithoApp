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
  'viewport.heatmap': 'Thickness Heatmap',

  // Language selector
  'lang.label': 'Language',

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

  // Color lithophane
  'mode.colorLitho': 'Color Litho',
  'tab.color': 'Color',
  'color.title': 'CMYW Channels',
  'color.info': 'Generates 5 separate layers (White base, Y, M, C, White top). The White base controls brightness through thickness; C/M/Y are thin color filters; White top is a light diffuser.',
  'color.channel': 'Preview Channel',
  'color.composite': 'Composite',
  'color.cyan': 'Cyan',
  'color.magenta': 'Magenta',
  'color.yellow': 'Yellow',
  'color.white': 'White Base',
  'color.white_top': 'White Top',
  'color.channelStats': 'Channel Stats',
  'color.vertices': 'Vertices',
  'color.exportAll': 'Export All Plates (ZIP)',
  'color.exportChannel': 'Export Channel STL',
  'color.registrationPins': 'Registration Pins',
  'color.registrationHint': 'Add alignment pins/holes for precise layer stacking.',
  'color.plateGap': 'Gap Between Plates',

  // Update toast
  'update.available': 'New version available',
  'update.hint': 'Refresh to get the latest features',
  'update.action': 'Update',

  // PWA Install prompt
  'install.title': 'Install LithoApp',
  'install.subtitle': 'Get the full native experience — faster, offline-ready.',
  'install.fast': 'Instant Launch',
  'install.offline': 'Works Offline',
  'install.native': 'Native Feel',
  'install.cta': 'Install App',
  'install.howto': 'How to Install',
  'install.ios.step1': 'Tap the Share button (bottom bar)',
  'install.ios.step2': 'Tap "Add to Home Screen"',
  'install.android.step1': 'Tap the Menu (⋮) button',
  'install.android.step2': 'Tap "Add to Home Screen"',
  'install.gotit': 'Got it',

  // Project Gallery
  'gallery.title': 'Project History',
  'gallery.empty': 'No saved projects yet',
  'gallery.emptyHint': 'Projects are auto-saved when you load a new image',
  'gallery.clearAll': 'Clear All',
  'gallery.clearConfirm': 'Delete all?',
  'gallery.restoreConfirm': 'Load this project? Unsaved changes will be lost.',
  'gallery.confirm': 'Load',
  'gallery.cancel': 'Cancel',
  'gallery.cacheUsage': 'Cache: {used} / {limit}',
  'gallery.delete': 'Delete',
  'gallery.rename': 'Double-click to rename',
  'gallery.autoSaved': 'Auto-saved',
  'gallery.recentProjects': 'Recent Projects',

  // Settings menu (mobile)
  'menu.save': 'Save Project',
  'menu.export': 'Export (.json)',
  'menu.import': 'Import Project',
  'menu.history': 'Project History',
  'menu.settings': 'Settings',
} as const;

export type TranslationKey = keyof typeof en;
export default en;
