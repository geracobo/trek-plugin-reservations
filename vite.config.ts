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
      fs.cpSync(path.resolve('src/server'), path.join(buildDir, 'server'), { recursive: true })
      // Server modules are loaded under TREK's Node permission sandbox, so a
      // runtime `require('tz-lookup')` cannot resolve into host node_modules.
      // Ship its self-contained lookup table beside the plugin server instead.
      const vendorDir = path.join(buildDir, 'server', 'vendor')
      fs.mkdirSync(vendorDir, { recursive: true })
      fs.copyFileSync(path.resolve('node_modules/tz-lookup/tz.js'), path.join(vendorDir, 'tz-lookup.js'))
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
