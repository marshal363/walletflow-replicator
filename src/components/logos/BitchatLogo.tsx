import React from 'react'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export default function Logo({ 
  className = "", 
  size = 'md',
  showText = true 
}: LogoProps) {
  const sizes = {
    sm: 24,
    md: 40,
    lg: 56
  }

  const logoSize = sizes[size]
  const textClass = size === 'sm' ? 'text-xl' : size === 'md' ? 'text-3xl' : 'text-4xl'

  return (
    <div className={`flex items-center ${className}`}>
      {/* Bitcoin Logo */}
      <div 
        className="shrink-0" 
        style={{ 
          width: logoSize, 
          height: logoSize 
        }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#0A84FF" />
          <path
            d="M63.75 41.25C62.5 35 57.5 33.75 51.25 33.75H47.5V28.75H42.5V33.75H38.75V28.75H33.75V33.75H26.25V38.75H31.25V61.25H26.25V66.25H33.75V71.25H38.75V66.25H42.5V71.25H47.5V66.25H51.25C58.75 66.25 65 63.75 65 55C65 51.25 63.75 48.75 61.25 47.5C63.75 46.25 64.375 43.75 63.75 41.25ZM37.5 38.75H51.25C55 38.75 57.5 40 57.5 43.75C57.5 47.5 55 48.75 51.25 48.75H37.5V38.75ZM52.5 61.25H37.5V51.25H52.5C56.25 51.25 58.75 52.5 58.75 56.25C58.75 60 56.25 61.25 52.5 61.25Z"
            fill="white"
            transform="rotate(13 50 50)"
          />
        </svg>
      </div>

      {/* Bitchat Text */}
      {showText && (
        <div className="relative ml-2">
          <span 
            className={`font-ubuntu font-bold italic ${textClass}`}
            style={{ 
              color: '#4D4D4D',
              textShadow: '0.5px 0.5px 0px rgba(0,0,0,0.1)'
            }}
          >
            bitchat
          </span>
        </div>
      )}
    </div>
  )
}