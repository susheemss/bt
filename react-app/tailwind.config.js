/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        bg:      '#FFFFFF',
        surface: '#FFFFFF',
        surface2:'#F1F3F6',
        surface3:'#E8ECF1',
        border:  '#E2E6EB',
        border2: '#D0D5DC',
        ink:     '#1A1D23',
        ink2:    '#3B4150',
        ink3:    '#5F6B7A',
        ink4:    '#8B95A5',
        ink5:    '#B0B8C4',
        blue:    { DEFAULT:'#2E6BE6', light:'#EBF1FD', dark:'#1D4FA0' },
        green:   { DEFAULT:'#1A8754', light:'#E6F5ED' },
        amber:   { DEFAULT:'#D97706', light:'#FEF3E2' },
        red:     { DEFAULT:'#C93B3B', light:'#FDE8E8' },
        purple:  { DEFAULT:'#6C5CE7', light:'#F0EEFE' },
        sidebar: { DEFAULT:'#1B2537', hover:'#253245' },
      },
      borderRadius: { sm:'4px', DEFAULT:'6px', lg:'10px' },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
        panel: '0 4px 16px rgba(0,0,0,.08)',
      },
    },
  },
  plugins: [],
}
