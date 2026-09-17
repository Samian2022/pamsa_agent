"use client";

import { useEffect, useState, type CSSProperties } from "react";

type Particle = {
  id: number;
  kind: "leaf" | "water" | "air" | "earth";
  x: string;
  y: string;
  size: string;
  delay: string;
  duration: string;
  tx: string;
  ty: string;
  rotation: string;
  tone: string;
};

const LEAF_TONES = ["#2d5a4a", "#4a7c5e", "#1a3a2e", "#a89968"];
const WATER_TONES = ["#6ba5a0", "#5b9db3"];
const AIR_TONES = ["rgba(45, 90, 74, 0.35)", "rgba(91, 157, 179, 0.35)"];
const EARTH_TONES = ["#a89968", "#c85a38", "#1a3a2e"];

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

function between(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function buildParticles(mobile: boolean): Particle[] {
  const scale = mobile ? 0.7 : 1;
  const counts = {
    leaf: Math.round(13 * scale),
    water: Math.round(11 * scale),
    air: Math.round(9 * scale),
    earth: Math.round(7 * scale),
  };
  const items: Particle[] = [];
  let id = 0;

  for (let i = 0; i < counts.leaf; i += 1) {
    const dir = Math.random() > 0.5 ? 1 : -1;
    items.push({
      id: id++,
      kind: "leaf",
      x: `${between(0, 100).toFixed(1)}vw`,
      y: `${between(102, 118).toFixed(1)}vh`,
      size: `${between(24, 48).toFixed(0)}px`,
      delay: `${between(0, 10).toFixed(2)}s`,
      duration: `${between(22, 28).toFixed(2)}s`,
      tx: `${(dir * between(80, 200)).toFixed(0)}px`,
      ty: `${(-1 * between(110, 140)).toFixed(0)}vh`,
      rotation: `${(dir * between(360, 1080)).toFixed(0)}deg`,
      tone: pick(LEAF_TONES),
    });
  }

  for (let i = 0; i < counts.water; i += 1) {
    const dir = Math.random() > 0.5 ? 1 : -1;
    items.push({
      id: id++,
      kind: "water",
      x: `${between(0, 100).toFixed(1)}vw`,
      y: `${between(102, 118).toFixed(1)}vh`,
      size: `${between(16, 32).toFixed(0)}px`,
      delay: `${between(0, 8).toFixed(2)}s`,
      duration: `${between(18, 24).toFixed(2)}s`,
      tx: `${(dir * between(100, 250)).toFixed(0)}px`,
      ty: `${(-1 * between(90, 120)).toFixed(0)}vh`,
      rotation: "0deg",
      tone: pick(WATER_TONES),
    });
  }

  for (let i = 0; i < counts.air; i += 1) {
    const dir = Math.random() > 0.5 ? 1 : -1;
    items.push({
      id: id++,
      kind: "air",
      x: `${between(0, 100).toFixed(1)}vw`,
      y: `${between(102, 118).toFixed(1)}vh`,
      size: `${between(60, 100).toFixed(0)}px`,
      delay: `${between(0, 12).toFixed(2)}s`,
      duration: `${between(20, 26).toFixed(2)}s`,
      tx: `${(dir * between(150, 300)).toFixed(0)}px`,
      ty: `${(-1 * between(80, 130)).toFixed(0)}vh`,
      rotation: "0deg",
      tone: pick(AIR_TONES),
    });
  }

  for (let i = 0; i < counts.earth; i += 1) {
    const dir = Math.random() > 0.5 ? 1 : -1;
    items.push({
      id: id++,
      kind: "earth",
      x: `${between(0, 100).toFixed(1)}vw`,
      y: `${between(102, 118).toFixed(1)}vh`,
      size: `${between(12, 28).toFixed(0)}px`,
      delay: `${between(0, 10).toFixed(2)}s`,
      duration: `${between(24, 30).toFixed(2)}s`,
      tx: `${(dir * between(50, 150)).toFixed(0)}px`,
      ty: `${(-1 * between(70, 110)).toFixed(0)}vh`,
      rotation: `${(dir * between(180, 720)).toFixed(0)}deg`,
      tone: pick(EARTH_TONES),
    });
  }

  return items;
}

export function ClimateField() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    setParticles(buildParticles(window.innerWidth < 768));
  }, []);

  if (!particles.length) return null;

  return (
    <div className="login-particles" aria-hidden>
      {particles.map((item) => (
        <span
          key={item.id}
          className={`climate-${item.kind}`}
          style={
            {
              "--x": item.x,
              "--y": item.y,
              "--size": item.size,
              "--delay": item.delay,
              "--duration": item.duration,
              "--tx": item.tx,
              "--ty": item.ty,
              "--rotation": item.rotation,
              "--tone": item.tone,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
