import createRuntime from '../../src/runtime/create-runtime.mjs'
import { test, before, after } from 'node:test'
import assert from 'node:assert'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdtemp, readFile, rm } from 'fs/promises'

const base = tmpdir()
let tmpDir
let log = []
before(async () => {
  tmpDir = await mkdtemp(join(base, 'test-create-platformatic-'))
})

after(async () => {
  log = []
  await rm(tmpDir, { recursive: true, force: true })
  process.env = {}
})

const fakeLogger = {
  debug: msg => log.push(msg),
  info: msg => log.push(msg)
}

test('creates runtime', async () => {
  const params = {
    servicesDir: 'services',
    entrypoint: 'foobar'
  }

  await createRuntime(params, fakeLogger, tmpDir, undefined)

  const pathToRuntimeConfigFile = join(tmpDir, 'platformatic.runtime.json')
  const runtimeConfigFile = await readFile(pathToRuntimeConfigFile, 'utf8')
  const runtimeConfig = JSON.parse(runtimeConfigFile)

  delete runtimeConfig.$schema

  assert.deepStrictEqual(runtimeConfig, {
    entrypoint: 'foobar',
    allowCycles: false,
    hotReload: true,
    autoload: {
      path: 'services',
      exclude: ['docs']
    }
  })
})

test('with a full path for autoload', async () => {
  const params = {
    servicesDir: join(tmpDir, 'services'),
    entrypoint: 'foobar'
  }

  await createRuntime(params, fakeLogger, tmpDir, undefined)

  const pathToRuntimeConfigFile = join(tmpDir, 'platformatic.runtime.json')
  const runtimeConfigFile = await readFile(pathToRuntimeConfigFile, 'utf8')
  const runtimeConfig = JSON.parse(runtimeConfigFile)

  delete runtimeConfig.$schema

  assert.deepStrictEqual(runtimeConfig, {
    entrypoint: 'foobar',
    allowCycles: false,
    hotReload: true,
    autoload: {
      path: 'services',
      exclude: ['docs']
    }
  })
})
