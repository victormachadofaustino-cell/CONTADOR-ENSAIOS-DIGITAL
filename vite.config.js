import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ajuste a 'base' para o nome do seu repositório ou use './' para caminhos relativos
  // Exemplo: se seu repositório for github.com/usuario/contador-ccb, coloque '/contador-ccb/'
  base: './', 
})