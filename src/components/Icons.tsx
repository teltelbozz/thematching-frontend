// src/components/Icons.tsx
import React from 'react';

export const People = (props: React.SVGProps<SVGSVGElement>) => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="#d9d9d9" strokeWidth="1.7" {...props}>
    <path d="M7 13a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm9 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z"/>
    <path d="M2 20a5 5 0 0 1 10 0M12 20a5 5 0 0 1 10 0"/>
  </svg>
);

export const Group = (props: React.SVGProps<SVGSVGElement>) => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="#d9d9d9" strokeWidth="1.7" {...props}>
    <circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><circle cx="12" cy="14.5" r="3"/>
    <path d="M3 20a5 5 0 0 1 10 0M11 20a5 5 0 0 1 10 0"/>
  </svg>
);

export const Clock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="#d9d9d9" strokeWidth="1.7" {...props}>
    <circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>
  </svg>
);

export const Home = (props: React.SVGProps<SVGSVGElement>) => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="#d9d9d9" strokeWidth="1.7" {...props}>
    <path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>
  </svg>
);

export const Gear = (props: React.SVGProps<SVGSVGElement>) => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="#d9d9d9" strokeWidth="1.7" {...props}>
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .3 1.9l.1.1-1.7 3a1.9 1.9 0 0 1-2.1.9l-1.5-.5a7.2 7.2 0 0 1-2.1.9l-.3 1.5a1.9 1.9 0 0 1-1.9 1.5H10a1.9 1.9 0 0 1-1.9-1.5l-.3-1.5a7.2 7.2 0 0 1-2.1-.9l-1.5.5a1.9 1.9 0 0 1-2.1-.9l-1.7-3 .1-.1A1.8 1.8 0 0 0 4.6 15a7.7 7.7 0 0 1 0-2 1.8 1.8 0 0 0-.3-1.9l-.1-.1 1.7-3a1.9 1.9 0 0 1 2.1-.9l1.5.5a7.2 7.2 0 0 1 2.1-.9l.3-1.5A1.9 1.9 0 0 1 12 1h0a1.9 1.9 0 0 1 1.9 1.5l.3 1.5a7.2 7.2 0 0 1 2.1.9l1.5-.5a1.9 1.9 0 0 1 2.1.9l1.7 3-.1.1a1.8 1.8 0 0 0-.3 1.9 7.7 7.7 0 0 1 0 2z"/>
  </svg>
);

export const Help = (props: React.SVGProps<SVGSVGElement>) => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="#d9d9d9" strokeWidth="1.7" {...props}>
    <circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.9 2 2.5 2.5 0 0 0-1.4 2v.5"/>
    <circle cx="12" cy="17" r="1"/>
  </svg>
);