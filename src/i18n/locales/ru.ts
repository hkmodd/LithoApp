import type { TranslationKey } from './en';

const ru: Record<TranslationKey, string> = {
  'app.subtitle': 'Нейронная Поверхность',
  'app.parameters': 'Параметры',
  'app.reset': 'Сбросить',
  'app.swipeDown': 'Свайп Вниз',
  'app.swipeUp': 'Свайп Вверх',
  'app.awaitingInput': 'Ожидание Входных Данных',

  'rotate.title': 'Поверните Устройство',
  'rotate.description': 'LithoApp оптимизирован для портретного режима на мобильных устройствах для лучшего 3D-опыта.',

  'mode.label': 'Режим Генерации',
  'mode.lithophane': 'Литофания',
  'mode.extrusion': 'Экструзия Логотипа',

  'upload.label': 'Исходное Изображение',
  'upload.replace': 'Заменить Изображение',
  'upload.dropHere': 'Перетащите Изображение Сюда',
  'upload.tapOrDrop': 'Нажмите или Перетащите Изображение',

  'tab.image': 'Изображение',
  'tab.geometry': 'Геометрия',
  'tab.frame': 'Рамка',

  'image.threshold': 'Порог Экструзии',
  'image.thresholdHint': 'Пиксели темнее этого значения будут экструдированы на максимальную толщину.',
  'image.contrast': 'Контраст',
  'image.brightness': 'Яркость',
  'image.edgeEnhancement': 'Улучшение Краёв',
  'image.edgeHint': 'Увеличивает локальный контраст для сохранения мелких деталей при 3D-печати.',
  'image.invertDepth': 'Инвертировать Полярность Глубины',

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

  'geo.shape': 'Форма',
  'geo.flat': 'Плоская',
  'geo.arc': 'Дуга',
  'geo.cylinder': 'Цилиндр',
  'geo.sphere': 'Сфера',
  'geo.heart': 'Сердце',
  'geo.maxDimension': 'Макс. Размер',
  'geo.meshDensity': 'Плотность Сетки (LOD)',
  'geo.baseThickness': 'Базовая Толщина (Z-min)',
  'geo.maxThickness': 'Макс. Толщина (Z-max)',
  'geo.smoothing': 'Лапласово Сглаживание',
  'geo.smoothingUnit': 'итер',

  'frame.borderWidth': 'Ширина Бордюра',
  'frame.frameThickness': 'Толщина Рамки',
  'frame.baseStand': 'Глубина Подставки',
  'frame.addHanger': 'Добавить Подвеску',
  'frame.hangerHint': 'Добавляет кольцо 5мм сверху по центру для удобного подвешивания литофании.',
  'frame.curveAngle': 'Угол Кривизны',
  'frame.fullCylinder': 'Режим полного цилиндра. Края сварены для герметичной 3D-печати.',

  'export.triangles': 'Треугольники',
  'export.estSize': 'Примерный Размер',
  'export.colorMirrored': 'Цвет (Зеркальный)',
  'export.colorTooltip': 'Скачать цветовой профиль (зеркальный для наклейки на обратную сторону)',
  'export.stlTooltip': 'Экспорт STL',
  'export.objTooltip': 'Экспорт OBJ (с UV)',

      'nav.preview': '????????',
  'nav.image': '???????????',
  'nav.geometry': '?????????',
  'nav.export': '???????',
  'viewport.colorMap': '???????? ?????',
  'lang.label': 'Язык',
};

export default ru;
