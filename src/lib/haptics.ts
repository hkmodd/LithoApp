/**
 * Haptic feedback utility for native-feel mobile interactions.
 *
 * Uses the Vibration API (navigator.vibrate).
 * Silently no-ops on devices/browsers that don't support it.
 */

const CAN_VIBRATE = typeof navigator !== 'undefined' && 'vibrate' in navigator;

/** Light tap — buttons, tabs, toggles */
export function tap() {
  if (CAN_VIBRATE) navigator.vibrate(8);
}

/** Micro tick — slider crossing a step boundary */
export function tick() {
  if (CAN_VIBRATE) navigator.vibrate(4);
}

/** Heavy pulse — export, reset, important actions */
export function heavy() {
  if (CAN_VIBRATE) navigator.vibrate(15);
}
