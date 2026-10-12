import "./hero-backdrop.css";

const links = [
  "M45 370 C180 235 260 292 392 191 S580 127 706 257",
  "M96 590 C225 435 335 450 451 550 S655 677 835 500",
  "M1144 180 C1005 275 955 195 835 335 S622 455 451 550",
  "M1120 640 C1000 510 975 575 835 500 S650 365 706 257",
  "M392 191 C355 385 560 367 706 257",
  "M835 335 C927 434 938 477 835 500",
];
const points: Array<[number, number, number]> = [[45,370,4],[392,191,6],[706,257,7],[96,590,4],[451,550,7],[835,500,6],[1144,180,4],[835,335,6],[1120,640,4]];

export default function HeroBackdrop() {
  return <div className="hero-network" aria-hidden="true">
    <div className="hero-network__depth" />
    <div className="hero-network__grid" />
    <svg className="hero-network__map" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="hero-network-line" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#32b8cb" stopOpacity=".08"/><stop offset=".5" stopColor="#8bcfa0" stopOpacity=".42"/><stop offset="1" stopColor="#596cbb" stopOpacity=".1"/></linearGradient>
        <radialGradient id="hero-network-node"><stop stopColor="#e8fff6"/><stop offset=".3" stopColor="#87d8b1" stopOpacity=".7"/><stop offset="1" stopColor="#87d8b1" stopOpacity="0"/></radialGradient>
      </defs>
      {links.map((path) => <path key={path} d={path} fill="none" stroke="url(#hero-network-line)" strokeWidth="1.2" />)}
      {points.map(([x,y,r]) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r={r * 3.8} fill="url(#hero-network-node)" opacity=".3"/><circle cx={x} cy={y} r={r / 2} fill="#c5f4d5" opacity=".65"/></g>)}
    </svg>
    <div className="hero-network__core" />
  </div>;
}
