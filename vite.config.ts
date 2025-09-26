import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/english-quiz-app/', // 👈 중요: '/저장소이름/' 으로 바꿔주세요!
})
