// TBA ISSI-Ausbildungslogo — Wortmarke der Fachkurse ISSI/RSI
// Rendert beide Varianten (hell/dunkel), CSS in index.css schaltet per
// [data-theme="dark"] auf das Hell-Bild um. Kein JS-Flimmern beim Mount.

interface Props {
  height?: number
  ariaLabel?: string
}

export default function IssiLogo({ height = 28, ariaLabel = 'TBA ISSI Ausbildung' }: Props) {
  const style = { height: `${height}px`, width: 'auto', display: 'block' } as const
  return (
    <>
      <img
        src="/logo/issi-logo_dunkel.png"
        alt={ariaLabel}
        className="issi-logo issi-logo--on-light"
        style={style}
        draggable={false}
      />
      <img
        src="/logo/issi-logo_hell.png"
        alt=""
        aria-hidden="true"
        className="issi-logo issi-logo--on-dark"
        style={style}
        draggable={false}
      />
    </>
  )
}
