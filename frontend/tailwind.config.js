/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Neo-Carbon Theme
                neon: {
                    green: '#00ff41',
                    cyan: '#00f0ff',
                    purple: '#b300ff',
                    pink: '#ff006e',
                },
                carbon: {
                    900: '#0a0e14',
                    800: '#121820',
                    700: '#1a2332',
                    600: '#232e44',
                    500: '#2c3956',
                },
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite',
                'float': 'float 6s ease-in-out infinite',
                'slide-up': 'slideUp 0.5s ease-out',
                'slide-down': 'slideDown 0.5s ease-out',
                'fade-in': 'fadeIn 0.5s ease-out',
                'ripple': 'ripple 0.6s linear',
            },
            keyframes: {
                glow: {
                    '0%, 100%': {
                        boxShadow: '0 0 20px rgba(0, 255, 65, 0.5), 0 0 40px rgba(0, 240, 255, 0.3)',
                    },
                    '50%': {
                        boxShadow: '0 0 40px rgba(0, 255, 65, 0.8), 0 0 60px rgba(0, 240, 255, 0.5)',
                    },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                slideUp: {
                    '0%': {
                        opacity: '0',
                        transform: 'translateY(30px)',
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateY(0)',
                    },
                },
                slideDown: {
                    '0%': {
                        opacity: '0',
                        transform: 'translateY(-30px)',
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateY(0)',
                    },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                ripple: {
                    '0%': {
                        transform: 'scale(0)',
                        opacity: '1',
                    },
                    '100%': {
                        transform: 'scale(4)',
                        opacity: '0',
                    },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'neon-gradient': 'linear-gradient(135deg, #00ff41 0%, #00f0ff 100%)',
                'carbon-gradient': 'linear-gradient(180deg, #0a0e14 0%, #1a2332 100%)',
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
}
