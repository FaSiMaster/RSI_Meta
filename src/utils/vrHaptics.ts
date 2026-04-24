// Haptisches Feedback fuer VR-Controller (v0.8.0).
//
// WebXR Gamepad Haptic Actuators sind nicht im TS-Default-Typing enthalten —
// wir greifen ueber `gamepad.hapticActuators[0].pulse(intensity, duration)` zu.
// Meta Quest Browser unterstuetzt das seit Quest-OS v37+. Fehlender Actuator
// oder nicht-VR-Session ist kein Fehler, dann no-op.
//
// Intensity 0-1, Duration in ms. Beide Controller werden gleichzeitig
// gepulst, damit das Feedback unabhaengig von der klickenden Hand spuerbar
// ist.

import { xrStore } from '../xrStore'

export type HapticIntent = 'hit' | 'miss' | 'bereits-gefunden'

interface HapticActuator {
  pulse?: (intensity: number, duration: number) => Promise<boolean>
}

function pulseAllControllers(intensity: number, duration: number): void {
  const session = xrStore.getState().session
  if (!session) return
  const sources = session.inputSources
  if (!sources) return
  for (const source of sources) {
    // WebXR Gamepad-Zugriff ist vendor-spezifisch getypt — bewusster Cast.
    const actuators = (source.gamepad as unknown as { hapticActuators?: HapticActuator[] } | undefined)?.hapticActuators
    if (!actuators || actuators.length === 0) continue
    const pulse = actuators[0].pulse
    if (typeof pulse === 'function') {
      pulse.call(actuators[0], intensity, duration).catch(() => { /* no-op bei Geraete-Abbruch */ })
    }
  }
}

export function triggerHaptic(intent: HapticIntent): void {
  switch (intent) {
    case 'hit':
      // Starker kurzer Puls — positives Feedback.
      pulseAllControllers(0.85, 80)
      return
    case 'bereits-gefunden':
      // Mittlerer Puls — Info statt Belohnung.
      pulseAllControllers(0.55, 120)
      return
    case 'miss':
      // Weicher Doppel-Puls — negatives Feedback ohne hart wirken.
      pulseAllControllers(0.40, 60)
      setTimeout(() => pulseAllControllers(0.40, 60), 150)
      return
  }
}
