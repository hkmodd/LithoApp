import type { TranslationKey } from './en';

const ar: Record<TranslationKey, string> = {
  'app.subtitle': 'سطح عصبي',
  'app.parameters': 'المعاملات',
  'app.reset': 'إعادة تعيين',
  'app.swipeDown': 'اسحب لأسفل',
  'app.swipeUp': 'اسحب لأعلى',
  'app.awaitingInput': 'في انتظار الإدخال',

  'rotate.title': 'يرجى تدوير جهازك',
  'rotate.description': 'تم تحسين LithoApp للوضع الرأسي على الأجهزة المحمولة لتوفير أفضل تجربة ثلاثية الأبعاد.',

  'mode.label': 'وضع التوليد',
  'mode.lithophane': 'ليثوفين',
  'mode.extrusion': 'بثق الشعار',

  'upload.label': 'الصورة المصدر',
  'upload.replace': 'استبدال الصورة',
  'upload.dropHere': 'أفلت الصورة هنا',
  'upload.tapOrDrop': 'انقر أو أفلت صورة',

  'tab.image': 'الصورة',
  'tab.geometry': 'الهندسة',
  'tab.frame': 'الإطار',

  'image.threshold': 'عتبة البثق',
  'image.thresholdHint': 'سيتم بثق البكسلات الأغمق من هذه القيمة إلى أقصى سمك.',
  'image.contrast': 'التباين',
  'image.brightness': 'السطوع',
  'image.edgeEnhancement': 'تحسين الحواف',
  'image.edgeHint': 'يزيد التباين المحلي للحفاظ على التفاصيل الدقيقة أثناء الطباعة ثلاثية الأبعاد.',
  'image.invertDepth': 'عكس قطبية العمق',

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

  'geo.shape': 'الشكل',
  'geo.flat': 'مسطح',
  'geo.arc': 'قوس',
  'geo.cylinder': 'أسطوانة',
  'geo.sphere': 'كرة',
  'geo.heart': 'قلب',
  'geo.maxDimension': 'البعد الأقصى',
  'geo.meshDensity': 'كثافة الشبكة (LOD)',
  'geo.baseThickness': 'سمك القاعدة (Z-min)',
  'geo.maxThickness': 'السمك الأقصى (Z-max)',
  'geo.smoothing': 'تنعيم لابلاسي',
  'geo.smoothingUnit': 'تكرار',

  'frame.borderWidth': 'عرض الحد',
  'frame.frameThickness': 'سمك الإطار',
  'frame.baseStand': 'عمق الحامل',
  'frame.addHanger': 'إضافة علاقة',
  'frame.hangerHint': 'يضيف حلقة 5 مم في أعلى المنتصف لتعليق الليثوفين بسهولة.',
  'frame.curveAngle': 'زاوية الانحناء',
  'frame.fullCylinder': 'وضع الأسطوانة الكاملة نشط. الحواف ملحومة للطباعة ثلاثية الأبعاد المقاومة للماء.',

  'export.triangles': 'المثلثات',
  'export.estSize': 'الحجم التقديري',
  'export.colorMirrored': 'اللون (معكوس)',
  'export.colorTooltip': 'تحميل ملف الألوان (معكوس للصق على الجانب الخلفي)',
  'export.stlTooltip': 'تصدير كـ STL',
  'export.objTooltip': 'تصدير كـ OBJ (مع UV)',

      'nav.preview': '??????',
  'nav.image': '????',
  'nav.geometry': '?????',
  'nav.export': '?????',
  'viewport.colorMap': '????? ???????',
  'lang.label': 'اللغة',
};

export default ar;
