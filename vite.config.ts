import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

function inlineClientHtml(): Plugin {
  const buildDir = path.resolve('build')
  const htmlTemplatePath = path.resolve('src/client/index.html')
  const htmlOutPath = path.join(buildDir, 'client', 'index.html')
  let watchMode = false

  return {
    name: 'inline-client-html',
    enforce: 'post',
    configResolved(config) {
      watchMode = config.build.watch != null
    },
    buildStart() {
      // Keep build/client and build/server alive while the SDK is watching them.
      // Deleting and recreating watched directories detaches fs.watch on some
      // platforms. Normal one-shot builds still start from a clean artifact.
      if (!watchMode) fs.rmSync(buildDir, { recursive: true, force: true })
    },
    generateBundle(_options, bundle) {
      const entries = Object.entries(bundle)
      const jsEntry = entries.find(([, output]) => output.type === 'chunk' && output.isEntry)
      const cssEntry = entries.find(([fileName, output]) => output.type === 'asset' && fileName.endsWith('.css'))

      if (!jsEntry || jsEntry[1].type !== 'chunk') {
        throw new Error('Vite did not emit a client JavaScript bundle')
      }

      const js = jsEntry[1].code.replace(/<\/script/gi, '<\\/script')
      const css = cssEntry && cssEntry[1].type === 'asset'
        ? String(cssEntry[1].source).replace(/<\/style/gi, '<\\/style')
        : ''

      const html = fs.readFileSync(htmlTemplatePath, 'utf8')
      const withCss = html.replace(
        /<style id="reservations-client-styles">[\s\S]*?<\/style>/,
        () => `<style id="reservations-client-styles">\n${css}\n</style>`,
      )
      const withJs = withCss.replace(
        /<script id="reservations-client-script">[\s\S]*?<\/script>/,
        () => `<script id="reservations-client-script">\n${js}\n</script>`,
      )

      if (withJs === html) throw new Error('Client HTML template is missing inline markers')

      fs.mkdirSync(path.dirname(htmlOutPath), { recursive: true })
      fs.writeFileSync(htmlOutPath, withJs)

      for (const [fileName] of entries) {
        delete bundle[fileName]
      }
    },
  }
}

function copyPluginFiles(): Plugin {
  const buildDir = path.resolve('build')
  const copyFile = (from: string, to: string) => {
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(from, to)
  }

  return {
    name: 'copy-plugin-files',
    closeBundle() {
      for (const file of ['trek-plugin.json', 'README.md', 'package.json']) {
        copyFile(path.resolve(file), path.join(buildDir, file))
      }
      for (const file of ['LICENSE', 'LICENSE.md']) {
        const source = path.resolve(file)
        if (fs.existsSync(source)) copyFile(source, path.join(buildDir, file))
      }
      copyFile(path.resolve('src/server/index.js'), path.join(buildDir, 'server', 'index.js'))
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), inlineClientHtml(), copyPluginFiles()],
  build: {
    outDir: 'build/assets',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'src/client/main.tsx',
      output: {
        format: 'iife',
        entryFileNames: 'main.js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'styles.css'
          return '[name][extname]'
        },
      },
    },
  },
})
