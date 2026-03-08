"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 行星数据：公转周期按 JPL 天文测算（恒星年），speed = 1/周期（相对地球）
// 数据来源：JPL DE440/DE441 星历表
const PLANETS = [
  { name: "水星", color: "#5b9bd5", orbitRadius: 0.12, size: 4, periodYears: 0.2408467, speed: 1 / 0.2408467 },
  { name: "金星", color: "#f4d03f", orbitRadius: 0.18, size: 5, periodYears: 0.61519726, speed: 1 / 0.61519726 },
  { name: "地球", color: "#5dade2", orbitRadius: 0.24, size: 6, periodYears: 1, speed: 1 },
  { name: "火星", color: "#e74c3c", orbitRadius: 0.32, size: 5, periodYears: 1.8808476, speed: 1 / 1.8808476 },
  { name: "木星", color: "#d4a574", orbitRadius: 0.48, size: 14, periodYears: 11.862615, speed: 1 / 11.862615 },
  { name: "土星", color: "#a5694f", orbitRadius: 0.58, size: 12, periodYears: 29.447498, speed: 1 / 29.447498 },
  { name: "天王星", color: "#85c1e9", orbitRadius: 0.68, size: 10, periodYears: 84.016846, speed: 1 / 84.016846 },
  { name: "海王星", color: "#7d3c98", orbitRadius: 0.78, size: 10, periodYears: 164.79132, speed: 1 / 164.79132 },
];

// 月球：绕地球公转，恒星月 27.32166 天（JPL），每年约 13.37 圈
const MOON = {
  name: "月球",
  color: "#95a5a6",
  orbitRadius: 0.035, // 地月距离（视觉放大以便观察）
  size: 2,
  periodDays: 27.32166,
  speed: 365.25636 / 27.32166, // 恒星年/恒星月，相对地球的角速度倍数
  parentIndex: 2, // 地球在 PLANETS 中的索引
};

const ASTEROID_BELT_INNER = 0.36;
const ASTEROID_BELT_OUTER = 0.42;
const ASTEROID_COUNT = 80;

// 哈雷彗星：椭圆轨道，近日点 0.59 AU（水星与金星之间），远日点 35 AU（海王星外）
// 按游戏内行星比例尺：地球 1 AU=0.24，海王星 30 AU=0.78，故近日点≈0.14，远日点≈0.91
const HALLEY = {
  name: "哈雷彗星",
  periodYears: 76.0,
  speed: 1 / 76,
  size: 3,
  color: "#bdc3c7",
  tailColor: "rgba(200, 220, 255, 0.5)",
  // 归一化椭圆：近日点 0.14（对应 0.59 AU），远日点 0.91（对应 35 AU）
  perihelion: 0.14,
  aphelion: 0.91,
  semiMajorAxis: (0.14 + 0.91) / 2,
  eccentricity: 0.733, // 适配视觉比例（真实 0.967 在压缩比例下会失真）
};

// 椭圆轨道极坐标：r = a(1-e²)/(1 + e*cos(θ))，θ=0 为近日点
function halleyRadius(theta: number): number {
  const e = HALLEY.eccentricity;
  const a = HALLEY.semiMajorAxis;
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
  return r;
}

const ALL_CELESTIAL = [...PLANETS, MOON, HALLEY];

// 天体介绍（暂停状态下点击展示）
const CELESTIAL_INTROS: Record<string, string> = {
  水星: "太阳系最内侧、最小的行星，公转周期约 88 天。表面温差极大，昼侧可达 430°C，夜侧可降至 -180°C。",
  金星: "地球的「姊妹星」，大小与地球相近。表面被浓厚二氧化碳大气包裹，温室效应强烈，地表温度约 465°C。",
  地球: "人类家园，唯一已知存在生命的行星。距太阳约 1.5 亿公里，公转周期 365.25 天，拥有液态水和适宜生命的大气。",
  火星: "红色星球，因地表氧化铁呈红色。曾可能存在液态水，现有多国探测器探索，是人类未来登陆的目标。",
  木星: "太阳系最大行星，质量约为其他行星总和的 2.5 倍。气态巨行星，有著名的大红斑风暴和众多卫星。",
  土星: "以壮观的环系闻名，由冰粒和岩石碎片组成。气态巨行星，密度低于水，若放入水中会漂浮。",
  天王星: "冰巨行星，呈蓝绿色。自转轴几乎躺在轨道面上，像是「侧躺」着绕太阳公转。",
  海王星: "太阳系最外侧的大行星，深蓝色。发现于 1846 年，有强烈的风暴和磁场。",
  月球: "地球唯一的天然卫星，距地约 38 万公里。公转周期约 27.3 天，对地球潮汐有重要影响，是人类唯一登陆过的地外天体。",
  哈雷彗星: "著名周期彗星，约 76 年回归一次。椭圆轨道，近日点在内行星区，远日点超出海王星。上次过近日点为 1986 年，下次约 2061 年。",
  太阳: "太阳系中心恒星，质量占整个太阳系的 99.86%。表面温度约 5500°C，核心通过核聚变产生能量，为地球提供光和热。",
};

type GameMode = "explore" | "quiz";

export default function SolarSystemGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameMode, setGameMode] = useState<GameMode>("explore");
  const [quizPlanet, setQuizPlanet] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [selectedIntro, setSelectedIntro] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeRef = useRef(0);
  const anglesRef = useRef<number[]>(PLANETS.map(() => Math.random() * Math.PI * 2));
  const halleyAngleRef = useRef(Math.PI * 0.3);
  const moonAngleRef = useRef(Math.random() * Math.PI * 2);
  const animationRef = useRef<number>(0);

  const startQuiz = useCallback(() => {
    const idx = Math.floor(Math.random() * ALL_CELESTIAL.length);
    const target = ALL_CELESTIAL[idx];
    setQuizPlanet(target.name);
    setMessage(`点击「${target.name}」`);
    setGameMode("quiz");
  }, []);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height) * 0.6;
      const time = isPaused ? pauseTimeRef.current : Date.now() / 1000;

      // 背景
      ctx.fillStyle = "#f5f0e6";
      ctx.fillRect(0, 0, width, height);

      // 手绘风格轨道线（8 条同心圆）
      ctx.strokeStyle = "#2d2d2d";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const r = scale * (0.12 + i * 0.095 + (i > 3 ? 0.06 : 0));
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2; a += 0.05) {
          const jitter = 2 + Math.sin(a * 3) * 1.5;
          const x = cx + (r + jitter) * Math.cos(a);
          const y = cy + (r + jitter) * Math.sin(a);
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // 哈雷彗星椭圆轨道（手绘风格）
      ctx.strokeStyle = "rgba(100, 100, 120, 0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2; a += 0.03) {
        const r = scale * halleyRadius(a);
        const jitter = 1 + Math.sin(a * 5) * 0.5;
        const x = cx + (r + jitter) * Math.cos(a);
        const y = cy + (r + jitter) * Math.sin(a);
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // 小行星带
      ctx.fillStyle = "rgba(128, 128, 128, 0.6)";
      for (let i = 0; i < ASTEROID_COUNT; i++) {
        const angle = (i / ASTEROID_COUNT) * Math.PI * 2 + (time * 0.5) % (Math.PI * 2);
        const r = scale * (ASTEROID_BELT_INNER + (ASTEROID_BELT_OUTER - ASTEROID_BELT_INNER) * (i % 3) / 3);
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        const size = 2 + (i % 3);
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }

      // 太阳
      ctx.fillStyle = "#f5d76e";
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e6c04a";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 行星
      const hitTargets: { name: string; x: number; y: number; r: number }[] = [];

      PLANETS.forEach((p, i) => {
        const angle = anglesRef.current[i] + time * p.speed;
        const r = scale * p.orbitRadius;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);

        hitTargets.push({ name: p.name, x, y, r: p.size + 8 });

        // 手绘风格行星（略不规则）
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const pts = 8;
        for (let j = 0; j <= pts; j++) {
          const a = (j / pts) * Math.PI * 2 + (i * 0.3);
          const jitter = p.size * (0.85 + Math.sin(a * 2) * 0.15);
          const px = x + jitter * Math.cos(a);
          const py = y + jitter * Math.sin(a);
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // 高亮当前 quiz 目标
        if (gameMode === "quiz" && quizPlanet === p.name) {
          ctx.strokeStyle = "#27ae60";
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.arc(x, y, p.size + 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 月球（绕地球公转，周期 27.32 天）
        if (i === MOON.parentIndex) {
          const mAngle = moonAngleRef.current + time * MOON.speed;
          const mR = scale * MOON.orbitRadius;
          const mx = x + mR * Math.cos(mAngle);
          const my = y + mR * Math.sin(mAngle);

          // 月球轨道线
          ctx.strokeStyle = "rgba(180, 180, 200, 0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, mR, 0, Math.PI * 2);
          ctx.stroke();

          // 月球
          ctx.fillStyle = MOON.color;
          ctx.beginPath();
          ctx.arc(mx, my, MOON.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.15)";
          ctx.lineWidth = 0.5;
          ctx.stroke();

          if (gameMode === "quiz" && quizPlanet === MOON.name) {
            ctx.strokeStyle = "#27ae60";
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.arc(mx, my, MOON.size + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          hitTargets.push({ name: MOON.name, x: mx, y: my, r: MOON.size + 10 });
        }
      });

      // 哈雷彗星（椭圆轨道，真近点角随时间增加）
      const hAngle = halleyAngleRef.current + time * HALLEY.speed;
      const hR = scale * halleyRadius(hAngle);
      const hx = cx + hR * Math.cos(hAngle);
      const hy = cy + hR * Math.sin(hAngle);

      // 彗尾（背向太阳）
      const tailLen = 25 + Math.sin(time * 2) * 5;
      const sunDir = Math.atan2(hy - cy, hx - cx);
      const tailAngle = sunDir + Math.PI;
      ctx.strokeStyle = HALLEY.tailColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(
        hx + tailLen * Math.cos(tailAngle),
        hy + tailLen * Math.sin(tailAngle)
      );
      ctx.stroke();

      // 彗核
      ctx.fillStyle = HALLEY.color;
      ctx.beginPath();
      ctx.arc(hx, hy, HALLEY.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      if (gameMode === "quiz" && quizPlanet === HALLEY.name) {
        ctx.strokeStyle = "#27ae60";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(hx, hy, HALLEY.size + 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      hitTargets.push({ name: HALLEY.name, x: hx, y: hy, r: HALLEY.size + 12 });

      return hitTargets;
    },
    [gameMode, quizPlanet, isPaused]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    };

    let hitTargets: { name: string; x: number; y: number; r: number }[] = [];

    const loop = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      hitTargets = draw(ctx, w, h) || [];
      animationRef.current = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    loop();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const scale = Math.min(rect.width, rect.height) * 0.6;

      let clicked: (typeof PLANETS[0] | typeof MOON | typeof HALLEY) | { name: string } | null = null;
      const time = isPaused ? pauseTimeRef.current : Date.now() / 1000;

      // 检测太阳（仅暂停时可点击）
      if (isPaused) {
        const sunR = 18;
        const distToSun = Math.hypot(clickX - cx, clickY - cy);
        if (distToSun < sunR + 15) {
          clicked = { name: "太阳" };
        }
      }

      // 检测行星
      for (let i = 0; i < PLANETS.length; i++) {
        const p = PLANETS[i];
        const angle = anglesRef.current[i] + time * p.speed;
        const r = scale * p.orbitRadius;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        const dist = Math.hypot(clickX - px, clickY - py);
        if (dist < p.size + 15) {
          clicked = p;
          break;
        }
      }

      // 检测月球
      if (!clicked) {
        const earthIdx = MOON.parentIndex;
        const earthAngle = anglesRef.current[earthIdx] + time * PLANETS[earthIdx].speed;
        const earthR = scale * PLANETS[earthIdx].orbitRadius;
        const earthX = cx + earthR * Math.cos(earthAngle);
        const earthY = cy + earthR * Math.sin(earthAngle);
        const mAngle = moonAngleRef.current + time * MOON.speed;
        const mR = scale * MOON.orbitRadius;
        const mx = earthX + mR * Math.cos(mAngle);
        const my = earthY + mR * Math.sin(mAngle);
        const dist = Math.hypot(clickX - mx, clickY - my);
        if (dist < MOON.size + 15) {
          clicked = MOON;
        }
      }

      // 检测哈雷彗星
      if (!clicked) {
        const hAngle = halleyAngleRef.current + time * HALLEY.speed;
        const hR = scale * halleyRadius(hAngle);
        const hx = cx + hR * Math.cos(hAngle);
        const hy = cy + hR * Math.sin(hAngle);
        const dist = Math.hypot(clickX - hx, clickY - hy);
        if (dist < HALLEY.size + 15) {
          clicked = HALLEY;
        }
      }

      if (clicked) {
        setSelectedPlanet(clicked.name);
        if (isPaused && gameMode !== "quiz") {
          setSelectedIntro(CELESTIAL_INTROS[clicked.name] ?? null);
        } else {
          setSelectedIntro(null);
          if (gameMode === "quiz") {
            if (clicked.name === quizPlanet) {
              setScore((s) => s + 10);
              setMessage("正确！+10 分");
              setTimeout(() => startQuiz(), 800);
            } else {
              setMessage("不对，再试一次");
            }
          } else {
            setMessage(`${clicked.name} - 点击「行星测验」开始游戏`);
          }
        }
      }
    },
    [gameMode, quizPlanet, startQuiz, isPaused]
  );

  return (
    <div className="relative w-full h-screen">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="absolute inset-0 cursor-pointer"
        style={{ touchAction: "none" }}
      />
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="bg-white/90 rounded-lg px-4 py-3 shadow-lg border border-amber-200 max-w-md pointer-events-auto">
          <p className="text-xl font-sketch font-bold text-amber-800">
            {selectedPlanet ? `当前选中：${selectedPlanet}` : isPaused ? (gameMode === "quiz" ? "暂停中 · 点击天体作答" : "暂停中 · 点击天体查看介绍") : "点击行星探索"}
          </p>
          {selectedIntro && (
            <div className="mt-2 flex items-start gap-2">
              <p className="text-base text-slate-700 leading-relaxed flex-1">{selectedIntro}</p>
              <button
                onClick={() => {
                  if (typeof window !== "undefined" && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                    const u = new SpeechSynthesisUtterance(selectedIntro);
                    u.lang = "zh-CN";
                    u.rate = 0.9;
                    window.speechSynthesis.speak(u);
                  }
                }}
                className="pointer-events-auto shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 transition"
                title="语音介绍"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-amber-700">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                  <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
                </svg>
              </button>
            </div>
          )}
          {!selectedIntro && message && (
            <p className="text-lg text-emerald-600 mt-1">{message}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!isPaused) {
                pauseTimeRef.current = Date.now() / 1000;
                setIsPaused(true);
              }
            }}
            className="pointer-events-auto px-4 py-2 bg-slate-100 border-2 border-slate-400 rounded-lg font-sketch font-bold text-slate-700 hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPaused}
          >
            暂停
          </button>
          <button
            onClick={() => {
              setIsPaused(false);
              setSelectedIntro(null);
            }}
            className="pointer-events-auto px-4 py-2 bg-emerald-100 border-2 border-emerald-500 rounded-lg font-sketch font-bold text-emerald-800 hover:bg-emerald-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isPaused}
          >
            启动
          </button>
          <button
            onClick={() => {
              setGameMode("explore");
              setQuizPlanet(null);
              setMessage(null);
            }}
            className="pointer-events-auto px-4 py-2 bg-amber-100 border-2 border-amber-400 rounded-lg font-sketch font-bold text-amber-800 hover:bg-amber-200 transition"
          >
            自由探索
          </button>
          <button
            onClick={startQuiz}
            className="pointer-events-auto px-4 py-2 bg-emerald-100 border-2 border-emerald-500 rounded-lg font-sketch font-bold text-emerald-800 hover:bg-emerald-200 transition"
          >
            行星测验
          </button>
          <div className="bg-white/90 rounded-lg px-4 py-2 shadow border border-amber-200">
            <span className="font-sketch font-bold text-amber-800">得分：</span>
            <span className="font-sketch font-bold text-xl text-amber-600">{score}</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <p className="text-amber-700/80 font-sketch text-lg">
          太阳轨道探险
        </p>
      </div>
    </div>
  );
}
