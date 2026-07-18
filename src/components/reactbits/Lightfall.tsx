import { useEffect, useRef } from 'react';
import { Mesh, Program, Renderer, Triangle } from 'ogl';

const vertex = `attribute vec2 position;attribute vec2 uv;varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,0.,1.);}`;
const fragment = `
precision highp float;
uniform vec3 iResolution;uniform vec2 iMouse;uniform float iTime;
uniform vec3 uColor0;uniform vec3 uColor1;uniform vec3 uColor2;uniform vec3 uBgColor;
uniform float uSpeed;uniform float uStreakWidth;uniform float uStreakLength;uniform float uGlow;uniform float uDensity;uniform float uTwinkle;uniform float uZoom;uniform float uBgGlow;uniform float uOpacity;uniform float uMouseStrength;uniform float uMouseRadius;
varying vec2 vUv;
vec3 palette(float h){return h<.333?uColor0:(h<.666?uColor1:uColor2);}
vec3 tanhv(vec3 x){vec3 e=exp(-2.*x);return(1.-e)/(1.+e);}
vec2 sceneC(vec2 frag,vec2 r){vec2 P=(frag+frag-r)/r.x;float z=0.;float d=1e3;vec4 O=vec4(0.);for(int k=0;k<39;k++){if(d<=1e-4)break;O=z*normalize(vec4(P,uZoom,0.))-vec4(0.,4.,1.,0.)/4.5;d=1.-sqrt(length(O*O));z+=d;}return vec2(O.x,atan(O.z,O.y));}
void mainImage(out vec4 o,vec2 C){vec2 r=iResolution.xy;vec2 uv0=(C+C-r)/r.x;float T=.1*iTime*uSpeed+9.;float rings=max(1.,floor(6.2831853*max(uDensity,.05)+.5));vec2 Y=vec2(5e-3,6.2831853/rings);vec2 c0=sceneC(C,r);vec2 cdx=sceneC(C+vec2(1.,0.),r);vec2 cdy=sceneC(C+vec2(0.,1.),r);vec2 dCx=cdx-c0;vec2 dCy=cdy-c0;dCx.y-=6.2831853*floor(dCx.y/6.2831853+.5);dCy.y-=6.2831853*floor(dCy.y/6.2831853+.5);vec2 fw=abs(dCx)+abs(dCy);C=c0;vec2 P=vec2(2.,1.)*uv0-(r/r.x)*vec2(0.,1.);vec4 O=vec4(uBgColor*90.*uBgGlow/(1e3*dot(P,P)+6.),0.);vec2 mN=(iMouse+iMouse-r)/r.x;float md=length(uv0-mN);float mGlow=exp(-md*md/max(uMouseRadius*uMouseRadius,1e-4))*uMouseStrength;O.rgb+=(uColor0+uColor1+uColor2)/3.*mGlow*.18;float zr=5e-4*uStreakWidth;vec2 rr=vec2(max(length(fw),1e-5));float tail=19./max(uStreakLength,.05);for(int m=0;m<8;m++){float jf=float(m)+1.;float ic=fract(sin(dot(vec2(jf,floor(C.x/Y.x+.5)),vec2(7.,11.))*73.));vec2 Pp=C-(T+T*ic)*vec2(0.,1.);Pp-=floor(Pp/Y+.5)*Y;float h=fract(8663.*ic);vec3 col=palette(h);float weight=mix(1.4,1.+sin(T+7.*h+4.),uTwinkle)*(1.+mGlow);vec2 inner=vec2(length(max(Pp,vec2(-1.,0.))),length(Pp)-zr)-zr;vec2 sm=vec2(1.)-smoothstep(-rr,rr,inner);O.rgb+=dot(sm,vec2(exp(tail*Pp.y),3.))*col*weight;C.x+=Y.x/8.;}vec3 colr=sqrt(tanhv(max(O.rgb*uGlow-vec3(.04,.08,.02),0.)));o=vec4(colr,uOpacity);}
void main(){vec4 color;mainImage(color,vUv*iResolution.xy);gl_FragColor=color;}`;

function hexToRgb(hex: string) { const value = hex.replace('#', '').padEnd(6, '0'); return [parseInt(value.slice(0, 2), 16) / 255, parseInt(value.slice(2, 4), 16) / 255, parseInt(value.slice(4, 6), 16) / 255]; }

export default function Lightfall({ className = '', colors = ['#60a5fa', '#2563eb', '#34d399'], backgroundColor = '#071426', speed = .32, streakWidth = .8, streakLength = 1.3, glow = .7, density = .45, twinkle = .35, zoom = 3.2, backgroundGlow = .35, opacity = .32, mouseStrength = .3, mouseRadius = .8 }: { className?: string; colors?: string[]; backgroundColor?: string; speed?: number; streakWidth?: number; streakLength?: number; glow?: number; density?: number; twinkle?: number; zoom?: number; backgroundGlow?: number; opacity?: number; mouseStrength?: number; mouseRadius?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    if (!container || matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 700) return;
    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 1.25), alpha: true, antialias: false });
    const gl = renderer.gl; const canvas = gl.canvas as HTMLCanvasElement; canvas.style.cssText = 'width:100%;height:100%;display:block'; container.appendChild(canvas);
    const palette = [colors[0], colors[1] || colors[0], colors[2] || colors[0]].map(hexToRgb);
    const uniforms = { iResolution: { value: [gl.drawingBufferWidth, gl.drawingBufferHeight, 1] }, iMouse: { value: [0, 0] }, iTime: { value: 0 }, uColor0: { value: palette[0] }, uColor1: { value: palette[1] }, uColor2: { value: palette[2] }, uBgColor: { value: hexToRgb(backgroundColor) }, uSpeed: { value: speed }, uStreakWidth: { value: streakWidth }, uStreakLength: { value: streakLength }, uGlow: { value: glow }, uDensity: { value: density }, uTwinkle: { value: twinkle }, uZoom: { value: zoom }, uBgGlow: { value: backgroundGlow }, uOpacity: { value: opacity }, uMouseStrength: { value: mouseStrength }, uMouseRadius: { value: mouseRadius } };
    const program = new Program(gl, { vertex, fragment, uniforms }); const geometry = new Triangle(gl); const mesh = new Mesh(gl, { geometry, program });
    const resize = () => { const rect = container.getBoundingClientRect(); renderer.setSize(rect.width, rect.height); uniforms.iResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight, 1]; };
    const pointer = (event: PointerEvent) => { const rect = canvas.getBoundingClientRect(); uniforms.iMouse.value = [(event.clientX - rect.left) * renderer.dpr, (rect.height - event.clientY + rect.top) * renderer.dpr]; };
    resize(); const observer = new ResizeObserver(resize); observer.observe(container); canvas.addEventListener('pointermove', pointer);
    let frame = 0; let visible = true; const visibility = () => { visible = !document.hidden; }; document.addEventListener('visibilitychange', visibility);
    const loop = (time: number) => { frame = requestAnimationFrame(loop); if (visible) { uniforms.iTime.value = time * .001; renderer.render({ scene: mesh }); } }; frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); canvas.removeEventListener('pointermove', pointer); document.removeEventListener('visibilitychange', visibility); if (canvas.parentElement === container) container.removeChild(canvas); };
  }, [backgroundColor, backgroundGlow, colors, density, glow, mouseRadius, mouseStrength, opacity, speed, streakLength, streakWidth, twinkle, zoom]);
  return <div ref={ref} className={`lightfall-container ${className}`}/>;
}
