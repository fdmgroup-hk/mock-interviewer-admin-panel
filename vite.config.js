import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
const pagesBasePath = process.env.GITHUB_ACTIONS && repository ? `/${repository}/` : '/'

export default defineConfig({
    base: pagesBasePath,
    plugins: [react()],
})
