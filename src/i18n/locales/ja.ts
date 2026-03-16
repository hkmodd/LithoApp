import type { TranslationKey } from './en';

const ja: Record<TranslationKey, string> = {
  'app.subtitle': 'ニューラルサーフェス',
  'app.parameters': 'パラメータ',
  'app.reset': 'リセット',
  'app.swipeDown': '下にスワイプ',
  'app.swipeUp': '上にスワイプ',
  'app.awaitingInput': '入力待ち',

  'rotate.title': 'デバイスを回転してください',
  'rotate.description': 'LithoAppは最高の3D体験のため、モバイルデバイスでは縦向きモードに最適化されています。',

  'mode.label': '生成モード',
  'mode.lithophane': 'リソファニー',
  'mode.extrusion': 'ロゴ押し出し',

  'upload.label': 'ソース画像',
  'upload.replace': '画像を差し替え',
  'upload.dropHere': 'ここに画像をドロップ',
  'upload.tapOrDrop': 'タップまたは画像をドロップ',

  'tab.image': '画像',
  'tab.geometry': 'ジオメトリ',
  'tab.frame': 'フレーム',

  'image.threshold': '押し出し閾値',
  'image.thresholdHint': 'この値より暗いピクセルは最大厚さまで押し出されます。',
  'image.contrast': 'コントラスト',
  'image.brightness': '明るさ',
  'image.edgeEnhancement': 'エッジ強調',
  'image.edgeHint': '3Dプリント時の微細なディテールを保つためローカルコントラストを強化します。',
  'image.invertDepth': '深度極性を反転',

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

  'geo.shape': '形状',
  'geo.flat': 'フラット',
  'geo.arc': 'アーク',
  'geo.cylinder': 'シリンダー',
  'geo.sphere': 'スフィア',
  'geo.heart': 'ハート',
  'geo.maxDimension': '最大寸法',
  'geo.meshDensity': 'メッシュ密度 (LOD)',
  'geo.baseThickness': 'ベース厚 (Z-min)',
  'geo.maxThickness': '最大厚 (Z-max)',
  'geo.smoothing': 'ラプラシアンスムージング',
  'geo.smoothingUnit': '回',

  'frame.borderWidth': 'ボーダー幅',
  'frame.frameThickness': 'フレーム厚',
  'frame.baseStand': 'スタンド深さ',
  'frame.addHanger': 'ハンガーを追加',
  'frame.hangerHint': '上部中央に5mmのリングを追加し、リソファニーを簡単に吊り下げられます（例：オーナメントとして）。',
  'frame.curveAngle': 'カーブ角度',
  'frame.fullCylinder': '完全シリンダーモード。エッジは溶接され、水密な3Dプリントが可能です。',

  'export.triangles': '三角形',
  'export.estSize': '推定サイズ',
  'export.colorMirrored': 'カラー（ミラー）',
  'export.colorTooltip': 'カラープロファイルをダウンロード（プリント裏面に貼るミラー版）',
  'export.stlTooltip': 'STLで出力',
  'export.objTooltip': 'OBJで出力（UV付き）',

      'nav.preview': '?????',
  'nav.image': '??',
  'nav.geometry': '?????',
  'nav.export': '??????',
  'viewport.colorMap': '??????',
  'viewport.heatmap': 'Thickness Heatmap',
  'lang.label': '言語',
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

export default ja;
