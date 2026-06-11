"use client";

import { useEffect, useRef, useState } from "react";
import { AuroraBackground } from "./aurora-background";

// 朝中心穿越星云的 warp 效果（域扭曲 fbm 星云 + 拉丝星点 + 纵深光核），
// 片元着色器实时渲染，像游戏 CG 飞行镜头。自包含、无外部素材；WebGL 不可用时降级到极光。

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.55;
  for(int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time * 0.001;
  float r = length(uv) + 1e-4;
  float ang = atan(uv.y, uv.x);
  float depth = 0.35 / r;            // 纵深：中心远、边缘近
  float fly = t * 1.7;               // 朝中心飞行

  vec2 q = vec2(ang * 0.9, depth + fly);
  float warp = fbm(q * 1.3 + vec2(0.0, fly * 0.5));
  float n = fbm(q * vec2(2.6, 1.7) + warp * 1.4);
  n = pow(clamp(n, 0.0, 1.0), 1.5);

  vec3 c1 = vec3(0.04, 0.05, 0.18);  // 深蓝底
  vec3 c2 = vec3(0.42, 0.16, 0.72);  // 紫
  vec3 c3 = vec3(0.05, 0.65, 0.85);  // 青（强对比）
  vec3 col = mix(c1, c2, n);
  col = mix(col, c3, smoothstep(0.55, 1.0, n) * 0.8);

  // 中心光核
  col += vec3(0.7, 0.8, 1.0) * pow(clamp(depth * 0.05, 0.0, 1.0), 1.5);
  col += vec3(0.18, 0.22, 0.5) * smoothstep(0.5, 0.0, r) * 0.5;

  // 拉丝星点（warp streaks）
  float cell = floor(ang * 64.0);
  float streak = hash(vec2(cell, floor(depth * 3.0 - fly * 6.0)));
  streak = step(0.972, streak);
  col += vec3(0.9, 0.95, 1.0) * streak * smoothstep(0.0, 0.5, r) * 1.2;

  col *= smoothstep(1.3, 0.12, r); // 暗角
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function CinematicBackground({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = (canvas.getContext("webgl", { antialias: false, alpha: false }) ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) {
      setFailed(true);
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      setFailed(true);
      return;
    }
    const prog = gl.createProgram();
    if (!prog) {
      setFailed(true);
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFailed(true);
      return;
    }
    gl.useProgram(prog);

    // 全屏三角形
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(r.width * dpr));
      const h = Math.max(1, Math.floor(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    const render = (t: number) => {
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce) raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      const ext = gl.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
    };
  }, []);

  if (failed) return <AuroraBackground className={className} />;
  return <canvas ref={ref} className={className} aria-hidden />;
}
