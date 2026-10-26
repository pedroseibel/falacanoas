import { daysLabel, SHARE_CARD_SIZE, type BairroCard, type ItemCard, type Outline, type ShareCard } from "@fala/core";
import type { ReactNode } from "react";

/**
 * The share card's layout, after the landing page's og.png: paper, the wordmark, the claim on the
 * left, the proof in a raised tray on the right. The accent only where DESIGN.md allows it: the clock
 * and the selected place. Satori draws a flexbox subset, so the two columns are placed absolutely
 * on the 1200×630 canvas and everything inside them is flex.
 */

const C = {
  paper: "#FAFAFA",
  ground: "#EFEFF1",
  panel: "#FFFFFF",
  ink: "#0E0F10",
  ink2: "#393B40",
  ink3: "#5F626A",
  line: "rgba(14,15,16,0.085)",
  line2: "rgba(14,15,16,0.16)",
  accent: "#0A6F4C",
  wash: "rgba(10,111,76,0.1)",
};

const SANS = "Geist";
const MONO = "Geist Mono";

/** The text column and the tray, as on og.png. */
const COLUMN = { left: 72, top: 64, width: 520, height: 502 };
const TRAY = { left: 640, top: 40, width: 520, height: 550, inset: 28, border: 1.5 };
/** The white card inside the tray (a box's width includes its padding and border). */
export const INNER = {
  width: TRAY.width - 2 * (TRAY.inset + TRAY.border),
  height: TRAY.height - 2 * (TRAY.inset + TRAY.border),
};

function Wordmark({ demo }: { demo: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ display: "flex", fontSize: 34, fontWeight: 600, letterSpacing: -0.6, color: C.ink }}>
        <span>Fala</span>
        <span style={{ color: C.accent }}>,</span>
        <span style={{ marginLeft: 9 }}>Canoas</span>
      </div>
      {demo && (
        <div
          style={{
            display: "flex",
            fontFamily: MONO,
            fontSize: 17,
            color: C.ink2,
            border: `1.5px solid ${C.line2}`,
            borderRadius: 999,
            padding: "3px 12px",
          }}
        >
          exemplo · dados fictícios
        </div>
      )}
    </div>
  );
}

function Column({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        ...COLUMN,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {children}
    </div>
  );
}

/** The right-hand tray, as on og.png: a ground frame holding a white card. */
function Tray({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        left: TRAY.left,
        top: TRAY.top,
        width: TRAY.width,
        height: TRAY.height,
        display: "flex",
        padding: TRAY.inset,
        borderRadius: 34,
        backgroundColor: C.ground,
        border: `${TRAY.border}px solid ${C.line}`,
      }}
    >
      <div
        style={{
          display: "flex",
          width: INNER.width,
          height: INNER.height,
          overflow: "hidden",
          borderRadius: 20,
          backgroundColor: C.panel,
          border: `${TRAY.border}px solid ${C.line}`,
          boxShadow: "0 18px 40px rgba(14,15,16,0.10)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** The bairro, filled in the selected-place wash, and the pin's dot with its halo (og.png). */
function Place({ outline, size }: { outline: Outline; size: number }) {
  const scale = Math.min(size / outline.width, size / outline.height);
  const r = (px: number) => px / scale;
  return (
    <svg
      width={outline.width * scale}
      height={outline.height * scale}
      viewBox={`0 0 ${outline.width} ${outline.height}`}
    >
      <path d={outline.d} fill={C.wash} stroke={C.accent} strokeWidth={r(2.5)} strokeLinejoin="round" />
      {outline.pin && (
        <>
          <circle cx={outline.pin.x} cy={outline.pin.y} r={r(15)} fill={C.wash} stroke={C.accent} strokeWidth={r(1)} />
          <circle cx={outline.pin.x} cy={outline.pin.y} r={r(7)} fill={C.accent} />
        </>
      )}
    </svg>
  );
}

function Link({ link }: { link: string }) {
  return <div style={{ display: "flex", fontFamily: MONO, fontSize: 22, color: C.ink2 }}>{link}</div>;
}

/** The clock: the number large, its unit and state stacked beside it. Esmerald while it runs. */
function Clock({ days, open }: { days: number; open: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
      <span
        style={{
          fontSize: 150,
          fontWeight: 600,
          lineHeight: 0.8,
          letterSpacing: -6,
          color: open ? C.accent : C.ink,
        }}
      >
        {days}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 44, fontWeight: 600, lineHeight: 1, letterSpacing: -1, color: C.ink }}>
          {daysLabel(days)}
        </span>
        <span style={{ fontSize: 26, lineHeight: 1.2, color: C.ink3 }}>{open ? "em aberto" : "até o conserto"}</span>
      </div>
    </div>
  );
}

function Item({ card }: { card: ItemCard }) {
  return (
    <>
      <Column>
        <Wordmark demo={card.demo} />
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <Clock days={card.days} open={card.open} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                display: "block",
                fontSize: 40,
                fontWeight: 600,
                lineHeight: 1.18,
                letterSpacing: -0.8,
                color: C.ink,
                lineClamp: 3,
              }}
            >
              {card.title}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: C.ink3 }}>
              {card.place ? `${card.category} · ${card.place}` : card.category}
            </div>
          </div>
        </div>
        <Link link={card.link} />
      </Column>
      <Tray>
        {card.photo ? (
          <img src={card.photo} width={INNER.width} height={INNER.height} style={{ objectFit: "cover" }} />
        ) : card.outline ? (
          <Place outline={card.outline} size={330} />
        ) : (
          <div style={{ display: "flex", fontSize: 30, color: C.ink3, padding: 40, textAlign: "center" }}>
            {card.category}
          </div>
        )}
      </Tray>
    </>
  );
}

/** Long names step down, so the widest bairro still fits the column. */
const nameSize = (name: string) => (name.length <= 9 ? 92 : name.length <= 13 ? 72 : 58);

function Bairro({ card }: { card: BairroCard }) {
  return (
    <>
      <Column>
        <Wordmark demo={card.demo} />
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          <div
            style={{
              display: "flex",
              fontSize: nameSize(card.name),
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: -3,
              color: C.ink,
            }}
          >
            {card.name}
          </div>
          <div style={{ display: "flex", gap: 52 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 76, fontWeight: 600, lineHeight: 1, letterSpacing: -2.5, color: C.ink }}>
                {card.open}
              </span>
              <span style={{ fontSize: 26, color: C.ink3 }}>{card.open === 1 ? "aberto" : "abertos"}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 76, fontWeight: 600, lineHeight: 1, letterSpacing: -2.5, color: C.accent }}>
                {card.overdue}
              </span>
              <span style={{ fontSize: 26, color: C.ink3 }}>há mais de {card.deadlineDays} dias</span>
            </div>
          </div>
        </div>
        <Link link={card.link} />
      </Column>
      <Tray>{card.outline ? <Place outline={card.outline} size={360} /> : null}</Tray>
    </>
  );
}

/** The card for Satori, 1200×630 on paper. */
export function cardElement(card: ShareCard) {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: SHARE_CARD_SIZE.width,
        height: SHARE_CARD_SIZE.height,
        backgroundColor: C.paper,
        fontFamily: SANS,
        color: C.ink,
      }}
    >
      {card.kind === "item" ? <Item card={card} /> : <Bairro card={card} />}
    </div>
  );
}
