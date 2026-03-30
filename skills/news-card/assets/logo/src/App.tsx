/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function App() {
  return (
    <div className="min-h-screen bg-[#f5f5f2] flex items-center justify-center p-8 overflow-hidden">
      {/* Square Logo Container with subtle shadow and animation */}
      <div 
        className="relative w-[600px] h-[600px] bg-[#f9f9f7] flex flex-col items-center justify-center select-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-xl animate-in fade-in zoom-in duration-1000 ease-out" 
        id="logo-container"
      >
        
        {/* Background Watermark - Two Lines: Tech (Top) and News (Bottom) */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-between py-4 pointer-events-none z-0 overflow-hidden"
        >
          <div className="text-[160px] font-cinzel font-bold text-[#c5a059] opacity-[0.06] uppercase tracking-tighter transform -rotate-6 select-none">
            Tech
          </div>
          <div className="text-[160px] font-cinzel font-bold text-[#c5a059] opacity-[0.06] uppercase tracking-tighter transform -rotate-6 select-none">
            News
          </div>
        </div>

        {/* Circular Frame (Double Line) - Refined stroke and glow */}
        <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 600 600">
          <defs>
            <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Top Arcs */}
          <g filter="url(#gold-glow)">
            <path 
              d="M 100,300 A 200,200 0 0,1 500,300" 
              fill="none" 
              stroke="#c5a059" 
              strokeWidth="2.5" 
              className="opacity-90"
            />
            <path 
              d="M 118,300 A 182,182 0 0,1 482,300" 
              fill="none" 
              stroke="#c5a059" 
              strokeWidth="2.5" 
              className="opacity-70"
            />
          </g>
          {/* Bottom Arcs */}
          <g filter="url(#gold-glow)">
            <path 
              d="M 100,300 A 200,200 0 0,0 500,300" 
              fill="none" 
              stroke="#c5a059" 
              strokeWidth="2.5" 
              className="opacity-90"
            />
            <path 
              d="M 118,300 A 182,182 0 0,0 482,300" 
              fill="none" 
              stroke="#c5a059" 
              strokeWidth="2.5" 
              className="opacity-70"
            />
          </g>
        </svg>

        {/* Top Content "zz" - Lowercase, Noto Serif SC, and adjusted for clarity */}
        <div className="absolute top-[185px] z-40 flex flex-col items-center transition-transform hover:scale-105 duration-300">
          <div className="text-[72px] font-noto-serif-sc font-black text-[#c5a059] leading-none tracking-tight drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)]">
            zz
          </div>
        </div>

        {/* Main Content "AI资讯日报" - Re-added background bar to cut the circle and watermark */}
        <div className="relative z-30 py-5 px-14 bg-[#f9f9f7]">
          <h1 className="text-[98px] font-noto-serif-sc font-black text-[#1a1a1a] leading-none tracking-[-0.03em] whitespace-nowrap">
            AI资讯日报
          </h1>
        </div>

        {/* Subtle Decorative Element */}
        <div className="absolute bottom-12 text-[10px] font-cinzel tracking-[0.5em] text-[#c5a059] opacity-40 uppercase">
          Est. 2026
        </div>

      </div>
    </div>
  );
}
