import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { injectTrekUi as injectTrekUiMarkup } from 'trek-plugin-sdk'
import fs from 'node:fs'
import path from 'node:path'

function injectTrekUi() {
  const htmlPath = path.resolve('build/reservations/client/index.html')

  return {
    name: 'inject-trek-ui',
    writeBundle() {
      fs.writeFileSync(htmlPath, injectTrekUiMarkup(fs.readFileSync(htmlPath, 'utf8')))
    },
  }
}

// Temporary compatibility workaround for TREK deployments that reject requests
// from the plugin frame's opaque `null` origin. Keep this isolated so it can be
// removed by deleting this plugin and its entry below when TREK's CORS handling
// no longer needs the workaround.
function inlineClientAssets() {
  const clientDir = path.resolve('build/reservations/client')

  return {
    name: 'inline-client-assets',
    writeBundle() {
      const htmlPath = path.join(clientDir, 'index.html')
      let html = fs.readFileSync(htmlPath, 'utf8')
      const inlined: string[] = []

      html = html.replace(
        /<script\s+type="module"\s+crossorigin\s+src="([^"]+)"><\/script>/g,
        (_match, src) => {
          const assetPath = path.resolve(clientDir, src.replace(/^\.\//, ''))
          const contents = fs.readFileSync(assetPath, 'utf8').replace(/<\/script/gi, '<\\/script')
          inlined.push(assetPath)
          return `<script type="module">${contents}</script>`
        },
      )

      html = html.replace(
        /<link\s+rel="stylesheet"\s+crossorigin\s+href="([^"]+)"\s*\/?\s*>/g,
        (_match, href) => {
          const assetPath = path.resolve(clientDir, href.replace(/^\.\//, ''))
          const contents = fs.readFileSync(assetPath, 'utf8').replace(/<\/style/gi, '<\\/style')
          inlined.push(assetPath)
          return `<style>${contents}</style>`
        },
      )

      fs.writeFileSync(htmlPath, html)
      for (const assetPath of inlined) fs.rmSync(assetPath, { force: true })
    },
  }
}

function copyPluginFiles() {
  const buildDir = path.resolve('build/reservations')

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
  // Remove inlineClientAssets() to restore the normal Vite asset-based bundle.
  plugins: [react(), tailwindcss(), copyPluginFiles(), injectTrekUi(), inlineClientAssets()],
  build: {
    outDir: path.resolve('build/reservations/client'),
    emptyOutDir: true,
  },
})
