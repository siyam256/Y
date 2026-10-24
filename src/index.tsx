import React, {createContext, useContext} from "react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  Sequence,
  interpolate,
  registerRoot,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {Audio} from "@remotion/media";
import {loadFont as loadBengali} from "@remotion/google-fonts/NotoSansBengali";
import {loadFont as loadSerif} from "@remotion/google-fonts/NotoSerif";

/* ───────────────────────── CONFIG ───────────────────────── */

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const DURATION_SEC = 244; // narration ends at ~243.8s
const AUDIO_FILE = "narration.mp3"; // put it in public/narration.mp3

type Ch = {children?: React.ReactNode};

const bn = loadBengali("normal", {
  weights: ["400", "700"],
  subsets: ["bengali", "latin"],
});
const serif = loadSerif("normal", {
  weights: ["400", "700"],
  subsets: ["latin", "greek"],
});
loadSerif("italic", {weights: ["400", "700"], subsets: ["latin", "greek"]});

const SANS = `${bn.fontFamily}, "Noto Sans Bengali", sans-serif`;
const SERIF = `${serif.fontFamily}, "Noto Serif", "DejaVu Serif", serif`;

const C = {
  text: "#f3f6ff",
  dim: "#a3b0d6",
  faint: "rgba(255,255,255,0.14)",
  card: "rgba(255,255,255,0.06)",
  amber: "#ffbf4d",
  cyan: "#52d9ff",
  green: "#72ffb4",
  violet: "#bfa4ff",
  pink: "#ff7eab",
};

/* ───────────────────────── TIMING HELPERS ───────────────────────── */
// All cues in the scenes below are ABSOLUTE seconds from the SRT.

const StartCtx = createContext(0);

const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return useContext(StartCtx) + f / fps;
};

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);

const useP = (at: number, dur = 0.7) => {
  const t = useT();
  return interpolate(t, [at, at + dur], [0, 1], {...clamp, easing: ease});
};

/* ───────────────────────── BUILDING BLOCKS ───────────────────────── */

const Reveal: React.FC<
  Ch & {
    at: number;
    dy?: number;
    dur?: number;
    dimAt?: number;
    dimTo?: number;
    style?: React.CSSProperties;
  }
> = ({at, dy = 36, dur = 0.7, dimAt, dimTo = 0.4, style, children}) => {
  const t = useT();
  const p = interpolate(t, [at, at + dur], [0, 1], {...clamp, easing: ease});
  const d =
    dimAt === undefined
      ? 1
      : interpolate(t, [dimAt, dimAt + 0.6], [1, dimTo], clamp);
  return (
    <div style={{opacity: p * d, translate: `0px ${(1 - p) * dy}px`, ...style}}>
      {children}
    </div>
  );
};

// Inline token reveal (for equations)
const Tok: React.FC<Ch & {at: number}> = ({at, children}) => (
  <Reveal at={at} dy={22} dur={0.5} style={{display: "inline-block"}}>
    {children}
  </Reveal>
);

// Visible only between two times (fade in / fade out)
const Show: React.FC<Ch & {from: number; to: number}> = ({
  from,
  to,
  children,
}) => {
  const t = useT();
  const o = interpolate(t, [from, from + 0.5, to - 0.5, to], [0, 1, 1, 0], clamp);
  return <div style={{position: "absolute", inset: 0, opacity: o}}>{children}</div>;
};

const Bn: React.FC<
  Ch & {size: number; color?: string; weight?: number; style?: React.CSSProperties}
> = ({size, color = C.text, weight = 400, style, children}) => (
  <div
    style={{
      fontFamily: SANS,
      fontSize: size,
      fontWeight: weight,
      color,
      lineHeight: 1.42,
      textWrap: "balance",
      ...style,
    }}
  >
    {children}
  </div>
);

const Eq: React.FC<Ch & {size: number; style?: React.CSSProperties}> = ({
  size,
  style,
  children,
}) => (
  <div
    style={{
      fontFamily: SERIF,
      fontSize: size,
      lineHeight: 1.22,
      whiteSpace: "nowrap",
      color: C.text,
      ...style,
    }}
  >
    {children}
  </div>
);

const Chip: React.FC<Ch & {color: string}> = ({color, children}) => (
  <div
    style={{
      display: "inline-block",
      fontFamily: SANS,
      fontWeight: 700,
      fontSize: 52,
      color: "#0b1020",
      background: color,
      padding: "6px 34px 10px",
      borderRadius: 999,
      lineHeight: 1.4,
    }}
  >
    {children}
  </div>
);

/* math atoms */
const Sup: React.FC<Ch> = ({children}) => (
  <span
    style={{
      fontSize: "0.56em",
      position: "relative",
      top: "-0.6em",
      marginLeft: "0.06em",
      fontStyle: "normal",
    }}
  >
    {children}
  </span>
);
const V: React.FC<Ch & {c: string}> = ({c, children}) => (
  <span style={{color: c, fontStyle: "italic", fontFamily: SERIF}}>{children}</span>
);
const Op: React.FC<Ch> = ({children}) => (
  <span style={{color: C.dim, padding: "0 0.26em"}}>{children}</span>
);
const U: React.FC<Ch> = ({children}) => (
  <span style={{fontSize: "0.6em", color: C.dim, marginLeft: "0.15em"}}>{children}</span>
);
const Cos2 = () => (
  <span>
    cos
    <Sup>2</Sup>
    <V c={C.pink}>λ</V>
  </span>
);
const Gap = () => <span style={{display: "inline-block", width: "0.2em"}} />;

const Formula: React.FC<{size: number}> = ({size}) => (
  <Eq size={size}>
    <V c={C.amber}>ΔW</V>
    <Op>=</Op>
    <V c={C.cyan}>m</V>
    <Gap />
    <V c={C.green}>ω</V>
    <Sup>2</Sup>
    <Gap />
    <V c={C.violet}>R</V>
    <Gap />
    <Cos2 />
  </Eq>
);

/* ───────────────────────── SCENE WRAPPER ───────────────────────── */

const SceneFrame: React.FC<Ch & {fadeIn: boolean; fadeOut: boolean}> = ({
  fadeIn,
  fadeOut,
  children,
}) => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const o = interpolate(
    f,
    [0, fadeIn ? 8 : 0, durationInFrames - (fadeOut ? 8 : 0), durationInFrames],
    [fadeIn ? 0 : 1, 1, 1, fadeOut ? 0 : 1],
    clamp,
  );
  return (
    <AbsoluteFill style={{opacity: o, padding: "110px 160px"}}>{children}</AbsoluteFill>
  );
};

const Scene: React.FC<
  Ch & {name: string; start: number; end: number; fadeIn?: boolean; fadeOut?: boolean}
> = ({name, start, end, fadeIn = true, fadeOut = true, children}) => {
  const from = Math.round(start * FPS);
  const dur = Math.round(end * FPS) - from;
  return (
    <Sequence name={name} from={from} durationInFrames={dur}>
      <StartCtx.Provider value={from / FPS}>
        <SceneFrame fadeIn={fadeIn} fadeOut={fadeOut}>
          {children}
        </SceneFrame>
      </StartCtx.Provider>
    </Sequence>
  );
};

const Background: React.FC = () => {
  const f = useCurrentFrame();
  const drift = interpolate(f, [0, DURATION_SEC * FPS], [20, 50]);
  return (
    <AbsoluteFill
      style={{background: "linear-gradient(135deg,#060a18 0%,#0e1736 55%,#130f2e 100%)"}}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 700px at ${drift}% 20%, rgba(82,217,255,0.10), transparent 70%), radial-gradient(900px 700px at 85% 90%, rgba(255,126,171,0.09), transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/* ───────────────────────── DIAGRAMS ───────────────────────── */

// Wireframe spinning globe (intro)
const Globe: React.FC<{size: number; id: string}> = ({size, id}) => {
  const t = useT();
  const r = size / 2;
  const rot = t * 38;
  const rad = (d: number) => (d * Math.PI) / 180;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{filter: "drop-shadow(0 0 70px rgba(82,217,255,0.35))"}}
    >
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#2c55b8" />
          <stop offset="1" stopColor="#0a1230" />
        </radialGradient>
      </defs>
      <circle cx={r} cy={r} r={r - 3} fill={`url(#${id})`} stroke="rgba(255,255,255,0.4)" strokeWidth={3} />
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const phi = rad(rot + k * 30);
        return (
          <ellipse
            key={k}
            cx={r}
            cy={r}
            rx={Math.abs(Math.cos(phi)) * (r - 3)}
            ry={r - 3}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={2.5}
          />
        );
      })}
      {[-60, -30, 0, 30, 60].map((lat) => {
        const y = r - (r - 3) * Math.sin(rad(lat));
        const hw = (r - 3) * Math.cos(rad(lat));
        return (
          <line
            key={lat}
            x1={r - hw}
            x2={r + hw}
            y1={y}
            y2={y}
            stroke={lat === 0 ? C.amber : "rgba(255,255,255,0.22)"}
            strokeWidth={lat === 0 ? 4 : 2.5}
          />
        );
      })}
    </svg>
  );
};

// Top view of the rotating Earth with a surface point and outward arrow
const TopView: React.FC<{size: number}> = ({size}) => {
  const t = useT();
  const c = size / 2;
  const R = size * 0.38;
  const ring = size * 0.45;
  const th = -t * 0.9;
  const px = c + R * Math.cos(th);
  const py = c + R * Math.sin(th);
  const len = size * 0.15;
  const tx = px + len * Math.cos(th);
  const ty = py + len * Math.sin(th);
  const arrow = interpolate(t, [44.2, 45.0], [0, 1], {...clamp});
  const head = (a: number) => [tx + 30 * Math.cos(th + a), ty + 30 * Math.sin(th + a)];
  const h1 = head(2.6);
  const h2 = head(-2.6);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="gTop" cx="40%" cy="35%" r="80%">
          <stop offset="0" stopColor="#2c55b8" />
          <stop offset="1" stopColor="#0a1230" />
        </radialGradient>
      </defs>
      <circle cx={c} cy={c} r={ring} fill="none" stroke={C.cyan} strokeWidth={6} strokeDasharray="46 34" strokeDashoffset={t * 70} opacity={0.8} />
      <circle cx={c} cy={c} r={R} fill="url(#gTop)" stroke="rgba(255,255,255,0.4)" strokeWidth={3} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
        <line
          key={k}
          x1={c}
          y1={c}
          x2={c + R * Math.cos(th + (k * Math.PI) / 4)}
          y2={c + R * Math.sin(th + (k * Math.PI) / 4)}
          stroke="rgba(255,255,255,0.16)"
          strokeWidth={2.5}
        />
      ))}
      <circle cx={c} cy={c} r={R * 0.5} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={2.5} />
      <text x={c} y={c + 30} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={96} fill={C.green}>
        ω
      </text>
      <circle cx={px} cy={py} r={26} fill={C.amber} opacity={0.3} />
      <circle cx={px} cy={py} r={15} fill={C.amber} />
      <g opacity={arrow}>
        <line x1={px} y1={py} x2={tx} y2={ty} stroke={C.amber} strokeWidth={9} strokeLinecap="round" />
        <polygon points={`${tx},${ty} ${h1[0]},${h1[1]} ${h2[0]},${h2[1]}`} fill={C.amber} />
      </g>
    </svg>
  );
};

// Side view with rotation axis, equator and a point at latitude `lam` (degrees)
const LatDiagram: React.FC<{size: number; lam: number}> = ({size, lam}) => {
  const k = size / 760;
  const cx = 380;
  const cy = 380;
  const R = 300;
  const a = (lam * Math.PI) / 180;
  const px = cx + R * Math.cos(a);
  const py = cy - R * Math.sin(a);
  const ar = 120;
  const ax = cx + ar * Math.cos(a);
  const ay = cy - ar * Math.sin(a);
  const lx = cx + 168 * Math.cos(a / 2);
  const ly = cy - 168 * Math.sin(a / 2) + 18;
  const rLabel = interpolate(Math.cos(a), [0.2, 0.4], [0, 1], clamp);
  return (
    <svg width={size} height={size} viewBox="0 0 760 760" style={{width: 760 * k, height: 760 * k}}>
      <defs>
        <radialGradient id="gLat" cx="40%" cy="35%" r="80%">
          <stop offset="0" stopColor="#2c55b8" />
          <stop offset="1" stopColor="#0a1230" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="url(#gLat)" stroke="rgba(255,255,255,0.4)" strokeWidth={3} />
      <line x1={cx} y1={cy - 350} x2={cx} y2={cy + 350} stroke={C.green} strokeWidth={5} strokeDasharray="18 12" />
      <text x={cx + 18} y={cy - 322} fontFamily={SANS} fontSize={36} fill={C.green}>
        ঘূর্ণন অক্ষ
      </text>
      <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="rgba(255,255,255,0.45)" strokeWidth={4} strokeDasharray="14 10" />
      <text x={cx - R + 28} y={cy - 16} fontFamily={SANS} fontSize={34} fill={C.dim}>
        বিষুবরেখা
      </text>
      {lam > 1 && <line x1={cx} y1={cy} x2={px} y2={py} stroke="rgba(255,255,255,0.8)" strokeWidth={5} />}
      {lam > 1 && (
        <line x1={cx} y1={py} x2={px} y2={py} stroke={C.cyan} strokeWidth={7} opacity={interpolate(Math.cos(a), [0.05, 0.2], [0, 1], clamp)} />
      )}
      <text x={(cx + px) / 2} y={py - 20} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={44} fill={C.cyan} opacity={rLabel}>
        R cos λ
      </text>
      {lam > 3 && (
        <path d={`M ${cx + ar} ${cy} A ${ar} ${ar} 0 0 0 ${ax} ${ay}`} fill="none" stroke={C.pink} strokeWidth={7} />
      )}
      {lam > 8 && (
        <text x={lx} y={ly} fontFamily={SERIF} fontStyle="italic" fontSize={58} fill={C.pink}>
          λ
        </text>
      )}
      <circle cx={px} cy={py} r={28} fill={C.amber} opacity={0.3} />
      <circle cx={px} cy={py} r={16} fill={C.amber} />
    </svg>
  );
};

/* ───────────────────────── SCENES ───────────────────────── */

// 1 — Intro (0.14 → 13.12)
const IntroScene: React.FC = () => (
  <>
    <div style={{position: "absolute", right: -190, top: 130}}>
      <Reveal at={0.2} dy={0} dur={1.6}>
        <Globe size={820} id="gIntro" />
      </Reveal>
    </div>
    <div style={{position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18}}>
      <Reveal at={0.3}>
        <Chip color={C.amber}>আজকের প্রশ্ন</Chip>
      </Reveal>
      <Reveal at={0.9}>
        <Bn size={132} weight={700} style={{lineHeight: 1.3}}>
          বুয়েট ভর্তি পরীক্ষা
        </Bn>
      </Reveal>
      <Reveal at={1.5}>
        <Bn size={132} weight={700} color={C.amber} style={{fontFamily: SERIF, lineHeight: 1.2}}>
          2025–26
        </Bn>
      </Reveal>
      <div style={{height: 28}} />
      <Reveal at={6.9}>
        <Bn size={72} color={C.dim}>প্রথম দেখায় কঠিন মনে হতে পারে</Bn>
      </Reveal>
      <Reveal at={9.6}>
        <Bn size={78} color={C.cyan} weight={700}>কিন্তু ধারণাটা বুঝলেই সহজ</Bn>
      </Reveal>
    </div>
  </>
);

// 2 — The question (13.12 → 37.9)
const QuestionScene: React.FC = () => (
  <div style={{display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", gap: 34}}>
    <Reveal at={13.2}>
      <Chip color={C.amber}>প্রশ্ন</Chip>
    </Reveal>
    <Reveal at={13.5}>
      <Bn size={76} style={{maxWidth: 1560, textWrap: "pretty"}}>
        একটি <span style={{color: C.cyan, fontWeight: 700}}>80 কেজি</span> ভরের বস্তুকে কত ডিগ্রি{" "}
        <span style={{color: C.pink, fontWeight: 700}}>অক্ষাংশে</span> রাখলে পৃথিবীর আহ্নিক গতির কারণে বস্তুটি{" "}
        <span style={{color: C.amber, fontWeight: 700}}>2 নিউটন</span> ওজন হারাবে?
      </Bn>
    </Reveal>
    <div style={{display: "flex", gap: 28, marginTop: 14}}>
      {[
        {at: 24.2, c: C.cyan, label: "ভর (জানা)", eq: <><V c={C.cyan}>m</V><Op>=</Op>80<U>kg</U></>},
        {at: 26.6, c: C.amber, label: "ওজন হ্রাস (জানা)", eq: <><V c={C.amber}>ΔW</V><Op>=</Op>2<U>N</U></>},
        {at: 29.6, c: C.pink, label: "অক্ষাংশ (নির্ণেয়)", eq: <><V c={C.pink}>λ</V><Op>=</Op>?</>},
      ].map((it, i) => (
        <Reveal key={i} at={it.at} dy={30} style={{flex: 1, background: C.card, border: `3px solid ${it.c}`, borderRadius: 30, padding: "14px 30px 20px"}}>
          <Bn size={48} color={it.c}>{it.label}</Bn>
          <Eq size={96}>{it.eq}</Eq>
        </Reveal>
      ))}
    </div>
  </div>
);

// 3 — Earth rotates (37.9 → 54.8)
const RotationScene: React.FC = () => (
  <div style={{display: "flex", alignItems: "center", gap: 70, height: "100%"}}>
    <Reveal at={38.0} dy={0}>
      <TopView size={760} />
    </Reveal>
    <div style={{flex: 1, display: "flex", flexDirection: "column", gap: 26}}>
      <Reveal at={37.9}>
        <Bn size={100} weight={700}>পৃথিবী স্থির নয়</Bn>
      </Reveal>
      <Reveal at={40.6}>
        <Bn size={64} color={C.dim}>নিজের অক্ষের চারদিকে প্রতিনিয়ত ঘুরছে</Bn>
      </Reveal>
      <Reveal at={44.0}>
        <Bn size={72} color={C.cyan} weight={700}>ঘূর্ণনের কারণে কেন্দ্রবিমুখ প্রভাব</Bn>
      </Reveal>
      <Reveal at={49.3}>
        <Bn size={88} color={C.amber} weight={700}>কার্যকর ওজন কমে যায়</Bn>
      </Reveal>
    </div>
  </div>
);

// 4 — Equator vs pole (54.8 → 78.02)
const LatitudeScene: React.FC = () => {
  const t = useT();
  const lam = interpolate(t, [54.8, 60.8, 63.3, 68.0, 69.2, 77.0], [0, 0, 90, 90, 0, 90], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const pct = Math.round(Math.cos((lam * Math.PI) / 180) ** 2 * 100);
  return (
    <div style={{display: "flex", alignItems: "center", gap: 80, height: "100%"}}>
      <Reveal at={54.9} dy={0}>
        <LatDiagram size={740} lam={lam} />
      </Reveal>
      <div style={{flex: 1}}>
        <div style={{position: "relative", height: 290}}>
          <Show from={54.8} to={61.8}>
            <Bn size={108} weight={700} color={C.cyan}>বিষুবরেখা</Bn>
            <Bn size={68} color={C.amber}>ওজন হ্রাস সর্বাধিক</Bn>
          </Show>
          <Show from={61.8} to={68.6}>
            <Bn size={108} weight={700} color={C.pink}>মেরু</Bn>
            <Bn size={68} color={C.amber}>ওজন হ্রাস শূন্য</Bn>
          </Show>
          <Show from={68.6} to={78.0}>
            <Bn size={78} weight={700}>বিষুবরেখা থেকে মেরুর দিকে</Bn>
            <Bn size={68} color={C.amber}>হ্রাস ক্রমশ কমে</Bn>
          </Show>
        </div>
        <Bn size={50} color={C.dim}>সর্বোচ্চ হ্রাসের তুলনায়</Bn>
        <Eq size={150} style={{color: C.amber}}>{pct}%</Eq>
        <div style={{height: 44, borderRadius: 22, background: "rgba(255,255,255,0.10)", overflow: "hidden"}}>
          <div style={{width: `${pct}%`, height: "100%", borderRadius: 22, background: `linear-gradient(90deg, ${C.amber}, #ff8a4d)`}} />
        </div>
      </div>
    </div>
  );
};

// 5 — The target (78.02 → 84.36)
const TargetScene: React.FC = () => (
  <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 20}}>
    <Reveal at={78.2}>
      <Bn size={100} weight={700}>
        কত ডিগ্রি <span style={{color: C.pink}}>অক্ষাংশে</span>?
      </Bn>
    </Reveal>
    <Reveal at={78.7}>
      <Eq size={180}>
        <V c={C.pink}>λ</V>
        <Op>=</Op>
        <span style={{color: C.pink}}>?</span>
      </Eq>
    </Reveal>
    <Reveal at={80.5}>
      <Eq size={120}>
        <V c={C.amber}>ΔW</V>
        <Op>=</Op>2<U>N</U>
      </Eq>
    </Reveal>
  </div>
);

// 6 — The formula (84.36 → 108.72)
const Legend: React.FC<{at: number; sym: string; color: string; label: string}> = ({at, sym, color, label}) => (
  <Reveal at={at} dy={28} style={{display: "flex", alignItems: "center", gap: 28, background: C.card, border: `2px solid ${C.faint}`, borderRadius: 28, padding: "14px 34px"}}>
    <Eq size={92} style={{width: 170}}>
      <V c={color}>{sym}</V>
    </Eq>
    <Bn size={52}>{label}</Bn>
  </Reveal>
);

const FormulaScene: React.FC = () => (
  <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 34}}>
    <Reveal at={84.5}>
      <Chip color={C.amber}>সূত্র</Chip>
    </Reveal>
    <Reveal at={86.2}>
      <Formula size={150} />
    </Reveal>
    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, width: "100%", marginTop: 10}}>
      <Legend at={92.6} sym="ΔW" color={C.amber} label="ওজনের হ্রাস" />
      <Legend at={95.3} sym="m" color={C.cyan} label="বস্তুর ভর" />
      <Legend at={96.9} sym="ω" color={C.green} label="পৃথিবীর কৌণিক বেগ" />
      <Legend at={99.9} sym="R" color={C.violet} label="পৃথিবীর ব্যাসার্ধ" />
      <Legend at={102.3} sym="λ" color={C.pink} label="অক্ষাংশ (নির্ণেয়)" />
    </div>
  </div>
);

// 7 — Given values (108.72 → 124.5)
const GivenRow: React.FC<Ch & {at: number; label: string}> = ({at, label, children}) => (
  <Reveal at={at} dy={30} style={{display: "flex", alignItems: "center", gap: 40, borderBottom: `2px solid ${C.faint}`, padding: "2px 0"}}>
    <Bn size={48} color={C.dim} style={{width: 470}}>{label}</Bn>
    <Eq size={92}>{children}</Eq>
  </Reveal>
);

const GivenScene: React.FC = () => (
  <div style={{display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", gap: 26}}>
    <Reveal at={108.8}>
      <Chip color={C.cyan}>দেওয়া মান</Chip>
    </Reveal>
    <GivenRow at={108.9} label="বস্তুর ভর">
      <V c={C.cyan}>m</V><Op>=</Op>80<U>kg</U>
    </GivenRow>
    <GivenRow at={111.4} label="ওজনের হ্রাস">
      <V c={C.amber}>ΔW</V><Op>=</Op>2<U>N</U>
    </GivenRow>
    <GivenRow at={113.8} label="পৃথিবীর কৌণিক বেগ">
      <V c={C.green}>ω</V><Op>=</Op>7.27<Op>×</Op>10<Sup>−5</Sup><U>rad/s</U>
    </GivenRow>
    <GivenRow at={119.6} label="পৃথিবীর ব্যাসার্ধ">
      <V c={C.violet}>R</V><Op>=</Op>6.4<Op>×</Op>10<Sup>6</Sup><U>m</U>
    </GivenRow>
  </div>
);

// 8 — Substitution (124.5 → 141.0)
const SubstituteScene: React.FC = () => (
  <div style={{display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", height: "100%", gap: 22}}>
    <Reveal at={124.6} style={{opacity: 0.7}}>
      <Formula size={84} />
    </Reveal>
    <Reveal at={127.6}>
      <Bn size={60} color={C.dim}>মান বসালে</Bn>
    </Reveal>
    <Eq size={118}>
      <Tok at={128.1}><span style={{color: C.amber}}>2</span></Tok>
      <Tok at={128.5}><Op>=</Op></Tok>
      <Tok at={128.9}><span style={{color: C.cyan}}>80</span></Tok>
      <Tok at={129.4}><Op>×</Op></Tok>
      <Tok at={129.9}>
        <span style={{color: C.green}}>
          (7.27 × 10<Sup>−5</Sup>)<Sup>2</Sup>
        </span>
      </Tok>
    </Eq>
    <Eq size={118}>
      <Tok at={134.2}><Op>×</Op></Tok>
      <Tok at={134.6}>
        <span style={{color: C.violet}}>
          6.4 × 10<Sup>6</Sup>
        </span>
      </Tok>
      <Tok at={136.1}><Op>×</Op></Tok>
      <Tok at={136.5}><Cos2 /></Tok>
    </Eq>
  </div>
);

// 9 — Simplification (141.0 → 182.44)
const SimplifyScene: React.FC = () => (
  <div style={{display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", height: "100%", gap: 20}}>
    <Reveal at={141.6} dimAt={148.6}>
      <Eq size={94}>
        <span style={{color: C.cyan}}>80</span>
        <Op>×</Op>
        <V c={C.green}>ω</V>
        <Sup>2</Sup>
        <Op>×</Op>
        <V c={C.violet}>R</V>
        <Tok at={146.2}>
          <Op>≈</Op>
          <b>2.706</b>
        </Tok>
      </Eq>
    </Reveal>
    <Reveal at={148.4} dimAt={156.8}>
      <Eq size={94}>
        <span style={{color: C.amber}}>2</span>
        <Op>=</Op>
        2.706<Gap />
        <Cos2 />
      </Eq>
    </Reveal>
    <Reveal at={156.6} dimAt={171.4}>
      <Eq size={94}>
        <Cos2 />
        <Op>=</Op>
        2 / 2.706
        <Tok at={165.4}>
          <Op>≈</Op>
          <b>0.739</b>
        </Tok>
      </Eq>
    </Reveal>
    <Reveal at={169.9}>
      <Bn size={50} color={C.dim}>দুই পাশে বর্গমূল নিলে</Bn>
    </Reveal>
    <Reveal at={171.2}>
      <Eq size={94}>
        cos<Gap />
        <V c={C.pink}>λ</V>
        <Op>≈</Op>
        <b>0.859</b>
      </Eq>
    </Reveal>
    <Reveal at={174.6} style={{marginTop: 14}}>
      <Bn size={66}>
        <span style={{fontFamily: SERIF}}>cos λ</span> জানা আছে, কিন্তু দরকার{" "}
        <span style={{fontFamily: SERIF, fontStyle: "italic", color: C.pink, fontWeight: 700}}>λ</span>
      </Bn>
    </Reveal>
  </div>
);

// 10 — Inverse cosine (182.44 → 194.5)
const InverseScene: React.FC = () => (
  <div style={{display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", height: "100%", gap: 24}}>
    <Reveal at={182.5} dur={0.4} style={{opacity: 0.6}}>
      <Eq size={88}>
        cos<Gap />
        <V c={C.pink}>λ</V>
        <Op>=</Op>0.859
      </Eq>
    </Reveal>
    <Reveal at={183.2}>
      <Bn size={56} color={C.dim}>
        দুই পাশে <span style={{fontFamily: SERIF}}>cos<Sup>−1</Sup></span> প্রয়োগ
      </Bn>
    </Reveal>
    <Reveal at={185.2}>
      <Eq size={132}>
        <V c={C.pink}>λ</V>
        <Op>=</Op>
        cos<Sup>−1</Sup>
        <Tok at={187.5}>(0.859)</Tok>
      </Eq>
    </Reveal>
    <Reveal at={189.0}>
      <Bn size={56} color={C.dim}>ক্যালকুলেটরে হিসাব করলে</Bn>
    </Reveal>
    <Reveal at={191.8}>
      <Eq size={176}>
        <V c={C.pink}>λ</V>
        <Op>≈</Op>
        <span style={{color: C.pink, fontWeight: 700}}>30.7°</span>
      </Eq>
    </Reveal>
  </div>
);

// 11 — The answer (194.5 → 210.2)
const AnswerScene: React.FC = () => {
  const t = useT();
  const lam = interpolate(t, [195.0, 198.8], [0, 30.7], {...clamp, easing: ease});
  return (
    <div style={{display: "flex", alignItems: "center", gap: 80, height: "100%"}}>
      <Reveal at={194.7} dy={0}>
        <LatDiagram size={740} lam={lam} />
      </Reveal>
      <div style={{flex: 1, display: "flex", flexDirection: "column", gap: 22}}>
        <Reveal at={194.7}>
          <Chip color={C.amber}>উত্তর</Chip>
        </Reveal>
        <Reveal at={195.2}>
          <Eq size={130}>
            <V c={C.pink}>λ</V>
            <Op>≈</Op>
            <span style={{color: C.pink, fontWeight: 700}}>30.7°</span>
          </Eq>
        </Reveal>
        <Reveal at={196.6}>
          <Bn size={52} color={C.dim}>সরলীকৃত মডেল অনুযায়ী</Bn>
        </Reveal>
        <Reveal at={204.3} style={{marginTop: 20}}>
          <Bn size={104} weight={700} color={C.amber}>
            প্রায় <span style={{fontFamily: SERIF}}>31°</span> অক্ষাংশ
          </Bn>
        </Reveal>
      </div>
    </div>
  );
};

// 12 — Three takeaways (210.2 → 234.5)
const Takeaway: React.FC<Ch & {at: number; n: string; color: string; dimAt?: number}> = ({at, n, color, dimAt, children}) => (
  <Reveal at={at} dimAt={dimAt} dimTo={0.55} style={{display: "flex", alignItems: "center", gap: 40}}>
    <div style={{width: 120, height: 120, flexShrink: 0, borderRadius: 60, border: `6px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center"}}>
      <Bn size={68} weight={700} color={color} style={{lineHeight: 1}}>{n}</Bn>
    </div>
    <Bn size={60} style={{flex: 1, textWrap: "pretty"}}>{children}</Bn>
  </Reveal>
);

const TakeawayScene: React.FC = () => (
  <div style={{display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", gap: 38}}>
    <Reveal at={210.4}>
      <Chip color={C.amber}>মনে রাখবে</Chip>
    </Reveal>
    <Takeaway at={212.4} n="১" color={C.cyan} dimAt={224.0}>
      পৃথিবীর আহ্নিক গতির কারণে কার্যকর ওজন কমে
    </Takeaway>
    <Takeaway at={218.0} n="২" color={C.green} dimAt={224.0}>
      ওজনের হ্রাস অক্ষাংশের উপর নির্ভর করে: বিষুবরেখায় সর্বাধিক, মেরুতে শূন্য
    </Takeaway>
    <Takeaway at={224.0} n="৩" color={C.pink}>
      অক্ষাংশ বের করতে <span style={{fontFamily: SERIF}}>cos<Sup>2</Sup>λ</span> বের করো, তারপর{" "}
      <span style={{fontFamily: SERIF}}>cos<Sup>−1</Sup></span> প্রয়োগ করো
    </Takeaway>
  </div>
);

// 13 — Outro (234.5 → 244)
const OutroScene: React.FC = () => {
  const strike = useP(236.0, 0.6);
  return (
    <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 18}}>
      <Reveal at={234.7}>
        <div style={{position: "relative", display: "inline-block"}}>
          <Bn size={100} color={C.dim} weight={700}>মুখস্থ করা</Bn>
          <div style={{position: "absolute", left: 0, top: "56%", height: 9, borderRadius: 5, background: C.pink, width: `${strike * 100}%`}} />
        </div>
      </Reveal>
      <Reveal at={236.9}>
        <Bn size={150} color={C.amber} weight={700}>ধারণা বুঝে শেখা</Bn>
      </Reveal>
      <Reveal at={238.4}>
        <Bn size={72} color={C.text}>অনেক বেশি কার্যকর</Bn>
      </Reveal>
      <Reveal at={240.6} style={{marginTop: 44, textAlign: "center"}}>
        <Bn size={76} color={C.cyan} weight={700}>বুয়েট ভর্তি পরীক্ষা 2025–26</Bn>
        <Bn size={64} color={C.dim}>প্রশ্নের সম্পূর্ণ সমাধান</Bn>
      </Reveal>
    </div>
  );
};

/* ───────────────────────── MAIN COMPOSITION ───────────────────────── */

const Main: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <Audio src={staticFile(AUDIO_FILE)} />
    <Scene name="Intro" start={0} end={13.12}><IntroScene /></Scene>
    <Scene name="Question" start={13.12} end={37.9}><QuestionScene /></Scene>
    <Scene name="Rotation" start={37.9} end={54.8}><RotationScene /></Scene>
    <Scene name="Latitude" start={54.8} end={78.02}><LatitudeScene /></Scene>
    <Scene name="Target" start={78.02} end={84.36}><TargetScene /></Scene>
    <Scene name="Formula" start={84.36} end={108.72}><FormulaScene /></Scene>
    <Scene name="Given" start={108.72} end={124.5}><GivenScene /></Scene>
    <Scene name="Substitute" start={124.5} end={141.0}><SubstituteScene /></Scene>
    <Scene name="Simplify" start={141.0} end={182.44}><SimplifyScene /></Scene>
    <Scene name="Inverse" start={182.44} end={194.5}><InverseScene /></Scene>
    <Scene name="Answer" start={194.5} end={210.2}><AnswerScene /></Scene>
    <Scene name="Takeaways" start={210.2} end={234.5}><TakeawayScene /></Scene>
    <Scene name="Outro" start={234.5} end={DURATION_SEC}><OutroScene /></Scene>
  </AbsoluteFill>
);

const Root: React.FC = () => (
  <Composition
    id="Main"
    component={Main}
    durationInFrames={DURATION_SEC * FPS}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);

registerRoot(Root);
