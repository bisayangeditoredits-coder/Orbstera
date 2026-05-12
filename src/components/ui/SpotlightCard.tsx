'use client';
import React, { useRef, useState } from 'react';

export function SpotlightCard({ 
  children, 
  className = '', 
  spotlightColor = 'rgba(56, 189, 248, 0.15)' 
}: { 
  children: React.ReactNode, 
  className?: string,
  spotlightColor?: string
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || isFocused) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setOpacity(1);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setOpacity(0);
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden group/spotlight ${className}`}
    >
      {/* Border Glow Effect */}
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/spotlight:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor.replace('0.15', '0.4').replace('0.12', '0.3')}, transparent 80%)`,
          zIndex: 1
        }}
      />
      
      {/* Background Glow Effect */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
          zIndex: 0
        }}
      />
      
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
