// TBA ISSI-Ausbildungslogo — Wortmarke der Fachkurse ISSI/RSI
// Rendert beide Varianten (hell/dunkel), CSS in index.css schaltet per
// [data-theme="dark"] auf das Hell-Bild um. Kein JS-Flimmern beim Mount.
//
// Wichtig: display-Property NICHT im Inline-Style setzen — sonst gewinnt
// der Inline-Style gegen die display:none-Regel aus index.css und beide
// Bilder werden gleichzeitig sichtbar.

interface Props {
  height?: number
  ariaLabel?: string
}

export default function IssiLogo({ height = 28, ariaLabel = 'TBA ISSI Ausbildung' }: Props) {
  const style = { height: `${height}px`, width: 'auto' } as const
  return (
    <>
      <img
        src="/logo/issi-logo_hell.png"
        alt={ariaLabel}
        className="issi-logo issi-logo--on-light"
        style={style}
        draggable={false}
      />
      <img
        src="/logo/issi-logo_dunkel.png"
        alt=""
        aria-hidden="true"
        className="issi-logo issi-logo--on-dark"
        style={style}
        draggable={false}
      />
    </>
  )
}
