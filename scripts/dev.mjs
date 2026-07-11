import { spawn } from 'node:child_process'
import path from 'node:path'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const viteCli = path.resolve('node_modules/vite/bin/vite.js')
const sdkCli = path.resolve('node_modules/trek-plugin-sdk/dist/cli/trek-plugin.js')
const children = new Set()
let stopping = false
let stoppingPromise = null

function run(command, args, { persistent = false } = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
  })

  if (persistent) children.add(child)
  child.once('exit', () => children.delete(child))
  return child
}

function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return child.exitCode === 0
      ? Promise.resolve()
      : Promise.reject(new Error(`process exited with ${child.signalCode ?? `code ${child.exitCode}`}`))
  }

  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`process exited with ${signal ?? `code ${code}`}`))
    })
  })
}

function killChild(child, signal) {
  if (child.exitCode !== null || child.signalCode !== null) return
  try {
    child.kill(signal)
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error
  }
}

function stop(signal = 'SIGTERM') {
  if (stoppingPromise) return stoppingPromise
  stopping = true
  stoppingPromise = (async () => {
    const running = [...children]
    for (const child of running) killChild(child, signal)
    await Promise.allSettled(running.map(waitForExit))
  })()
  return stoppingPromise
}

function restoreTerminal() {
  if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
    try { process.stdin.setRawMode(false) } catch { /* terminal already closed */ }
  }
  if (process.stdout.isTTY) process.stdout.write('\u001b[0m\u001b[?25h')
}

let requestedSignal = null
process.once('SIGINT', () => {
  requestedSignal = 'SIGINT'
  void stop('SIGINT')
})
process.once('SIGTERM', () => {
  requestedSignal = 'SIGTERM'
  void stop('SIGTERM')
})
process.once('exit', () => {
  // Last-resort synchronous cleanup for parent-shell exit or an uncaught error.
  for (const child of children) killChild(child, 'SIGTERM')
  restoreTerminal()
})

try {
  // Give the SDK a complete artifact before it starts watching build/.
  await waitForExit(run(npm, ['run', 'build']))

  // Launch the CLIs directly. Persistent npm wrappers can survive independently
  // of their grandchildren and make reliable terminal shutdown much harder.
  const watcher = run(process.execPath, [viteCli, 'build', '--watch'], { persistent: true })
  const sdk = run(process.execPath, [sdkCli, 'dev', 'build'], { persistent: true })

  await Promise.race([
    waitForExit(watcher),
    waitForExit(sdk),
  ])
} catch (error) {
  if (!stopping) {
    console.error(`Development server stopped: ${error.message}`)
    process.exitCode = 1
  }
} finally {
  await stop(requestedSignal ?? 'SIGTERM')
  restoreTerminal()
}
