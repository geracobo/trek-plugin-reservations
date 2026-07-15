import { spawn } from 'node:child_process'
import path from 'node:path'

const vite = path.resolve('node_modules/vite/bin/vite.js')
const sdk = path.resolve('node_modules/trek-plugin-sdk/dist/cli/trek-plugin.js')
const children = [
  spawn(process.execPath, [vite, 'build', '--watch'], { stdio: 'inherit' }),
  spawn(process.execPath, [sdk, 'dev', 'build/reservations'], { stdio: 'inherit' }),
]

let stopping = false
let requestedSignal = null
let remaining = children.length
let failureCode = 0

const stop = (signal) => {
  if (stopping) return
  stopping = true
  requestedSignal = signal
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal)
  }
}

process.once('SIGINT', () => stop('SIGINT'))
process.once('SIGTERM', () => stop('SIGTERM'))

for (const child of children) {
  child.once('exit', (code, signal) => {
    remaining -= 1
    if (!stopping) {
      failureCode = code ?? (signal ? 1 : 0)
      stop('SIGTERM')
    }
    if (remaining === 0) {
      process.exitCode = requestedSignal === 'SIGINT' ? 130 : requestedSignal === 'SIGTERM' ? 143 : failureCode
    }
  })
}
