import React from 'react'

interface LogoProps {
  className?: string
}

export default function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <svg
        className="w-8 h-8 mr-2"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="50" fill="#F7931A" />
        <path
          d="M70.7 50.7c1-6.7-4.1-10.3-11-12.7l2.2-9-5.5-1.4-2.2 8.7c-1.4-0.4-2.9-0.7-4.3-1l2.2-8.8-5.5-1.4-2.2 9c-1.2-0.3-2.3-0.6-3.4-0.9v0l-7.6-1.9-1.5 5.9s4.1 0.9 4 1c2.2 0.6 2.6 2 2.5 3.2l-2.5 10.1c0.1 0 0.3 0.1 0.5 0.2-0.2 0-0.3-0.1-0.5-0.1l-3.5 14.1c-0.3 0.7-1 1.7-2.6 1.3 0.1 0.1-4 0-4 0l-2.7 6.3 7.2 1.8c1.3 0.3 2.6 0.7 3.9 1l-2.3 9.1 5.5 1.4 2.2-9c1.5 0.4 2.9 0.8 4.3 1.1l-2.2 8.9 5.5 1.4 2.3-9.1c9.3 1.8 16.3 1.1 19.2-7.4 2.4-6.8-0.1-10.7-5-13.2 3.6-0.8 6.3-3.2 7-8.1zM59.3 66.6c-1.7 6.8-13.1 3.1-16.8 2.2l3-12c3.7 0.9 15.6 2.7 13.8 9.8zm1.7-17.7c-1.5 6.2-11 3.1-14.1 2.3l2.7-10.9c3.1 0.8 13 2.3 11.4 8.6z"
          fill="white"
        />
      </svg>
      <span className="text-2xl font-bold italic text-gray-700 font-ubuntu">bitbank</span>
    </div>
  )
}