import { Buffer } from 'buffer';

// Polyfill Buffer
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

// Polyfill process
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.process = window.process || {
    env: { NODE_DEBUG: undefined },
    version: '',
    versions: { node: '16.0.0' },
  };
}

// Polyfill global
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.global = window;
}

export {}; 