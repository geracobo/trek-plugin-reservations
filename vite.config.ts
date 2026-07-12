import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { injectTrekUi as injectTrekUiMarkup } from 'trek-plugin-sdk'
import fs from 'node:fs'
import path from 'node:path'

function injectTrekUi() {
  const htmlPath = path.resolve('build/client/index.html')

  return {
    name: 'inject-trek-ui',
    writeBundle() {
      fs.writeFileSync(htmlPath, injectTrekUiMarkup(fs.readFileSync(htmlPath, 'utf8')))
    },
  }
}

function copyPluginFiles() {
  const buildDir = path.resolve('build')

  return {
    name: 'copy-plugin-files',
    writeBundle() {
      for (const file of ['trek-plugin.json', 'README.md', 'package.json']) {
        fs.copyFileSync(path.resolve(file), path.join(buildDir, file))
      }
      for (const file of ['LICENSE', 'LICENSE.md']) {
        const source = path.resolve(file)
        if (fs.existsSync(source)) fs.copyFileSync(source, path.join(buildDir, file))
      }
      fs.mkdirSync(path.join(buildDir, 'server'), { recursive: true })
      fs.copyFileSync(path.resolve('src/server/index.js'), path.join(buildDir, 'server', 'index.js'))
    },
  }
}

export default defineConfig({
  base: './',
  root: 'src/client',
  plugins: [react(), tailwindcss(), copyPluginFiles(), injectTrekUi()],
  build: {
    outDir: path.resolve('build/client'),
    emptyOutDir: true,
  },
})
