import type { TranslationKey } from './en';

const hi: Record<TranslationKey, string> = {
  'app.subtitle': 'न्यूरल सरफेस',
  'app.parameters': 'पैरामीटर',
  'app.reset': 'रीसेट',
  'app.swipeDown': 'नीचे स्वाइप करें',
  'app.swipeUp': 'ऊपर स्वाइप करें',
  'app.awaitingInput': 'इनपुट की प्रतीक्षा',

  'rotate.title': 'कृपया अपना डिवाइस घुमाएं',
  'rotate.description': 'सर्वोत्तम 3D अनुभव के लिए LithoApp मोबाइल पर पोर्ट्रेट मोड के लिए ऑप्टिमाइज़ किया गया है।',

  'mode.label': 'जनरेशन मोड',
  'mode.lithophane': 'लिथोफेन',
  'mode.extrusion': 'लोगो एक्सट्रूज़न',

  'upload.label': 'सोर्स इमेज',
  'upload.replace': 'इमेज बदलें',
  'upload.dropHere': 'इमेज यहाँ छोड़ें',
  'upload.tapOrDrop': 'टैप या इमेज ड्रॉप करें',

  'tab.image': 'इमेज',
  'tab.geometry': 'ज्यामिति',
  'tab.frame': 'फ्रेम',

  'image.threshold': 'एक्सट्रूज़न थ्रेशोल्ड',
  'image.thresholdHint': 'इस मान से गहरे पिक्सल अधिकतम मोटाई तक एक्सट्रूड किए जाएंगे।',
  'image.contrast': 'कंट्रास्ट',
  'image.brightness': 'ब्राइटनेस',
  'image.edgeEnhancement': 'एज एन्हांसमेंट',
  'image.edgeHint': '3D प्रिंटिंग में बारीक विवरण संरक्षित करने के लिए स्थानीय कंट्रास्ट बढ़ाता है।',
  'image.invertDepth': 'गहराई ध्रुवता उलटें',

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

  'geo.shape': 'आकार',
  'geo.flat': 'सपाट',
  'geo.arc': 'आर्क',
  'geo.cylinder': 'सिलिंडर',
  'geo.sphere': 'गोला',
  'geo.heart': 'दिल',
  'geo.maxDimension': 'अधिकतम आयाम',
  'geo.meshDensity': 'मेश घनत्व (LOD)',
  'geo.baseThickness': 'बेस मोटाई (Z-min)',
  'geo.maxThickness': 'अधिकतम मोटाई (Z-max)',
  'geo.smoothing': 'लाप्लासियन स्मूदिंग',
  'geo.smoothingUnit': 'इटर',

  'frame.borderWidth': 'बॉर्डर चौड़ाई',
  'frame.frameThickness': 'फ्रेम मोटाई',
  'frame.baseStand': 'बेस स्टैंड गहराई',
  'frame.addHanger': 'हैंगर जोड़ें',
  'frame.hangerHint': 'लिथोफेन को आसानी से लटकाने के लिए ऊपर 5mm की रिंग जोड़ता है।',
  'frame.curveAngle': 'कर्व एंगल',
  'frame.fullCylinder': 'पूर्ण सिलिंडर मोड सक्रिय। वाटरटाइट 3D प्रिंटिंग के लिए किनारे वेल्ड किए गए हैं।',

  'export.triangles': 'त्रिभुज',
  'export.estSize': 'अनुमानित आकार',
  'export.colorMirrored': 'रंग (मिरर)',
  'export.colorTooltip': 'कलर प्रोफ़ाइल डाउनलोड करें (प्रिंट के पीछे चिपकाने के लिए मिरर)',
  'export.stlTooltip': 'STL के रूप में निर्यात',
  'export.objTooltip': 'OBJ के रूप में निर्यात (UV सहित)',

      'nav.preview': '???????????',
  'nav.image': '???',
  'nav.geometry': '????????',
  'nav.export': '???????',
  'viewport.colorMap': '??? ????????',
  'lang.label': 'भाषा',
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

export default hi;
