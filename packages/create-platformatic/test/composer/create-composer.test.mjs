import createComposer from '../../src/composer/create-composer.mjs'
import { test, before, after } from 'node:test'
import assert from 'node:assert'
import { tmpdir } from 'os'
import { join } from 'path'
import dotenv from 'dotenv'
import { mkdtemp, readFile, rm, stat } from 'fs/promises'

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

test('creates composer', async () => {
  const params = {
    hostname: 'myhost',
    port: 6666,
    typescript: false
  }

  await createComposer(params, fakeLogger, tmpDir)

  const pathToComposerConfigFile = join(tmpDir, 'platformatic.composer.json')
  const composerConfigFile = await readFile(pathToComposerConfigFile, 'utf8')
  const composerConfig = JSON.parse(composerConfigFile)
  const { server, composer } = composerConfig

  assert.strictEqual(server.hostname, '{PLT_SERVER_HOSTNAME}')
  assert.strictEqual(server.port, '{PORT}')

  const pathToDbEnvFile = join(tmpDir, '.env')
  dotenv.config({ path: pathToDbEnvFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, 'myhost')
  assert.strictEqual(process.env.PORT, '6666')
  process.env = {}

  const pathToDbEnvSampleFile = join(tmpDir, '.env.sample')
  dotenv.config({ path: pathToDbEnvSampleFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, 'myhost')
  assert.strictEqual(process.env.PORT, '6666')

  assert.deepStrictEqual(composer, {
    services: [{
      id: 'example',
      origin: '{PLT_EXAMPLE_ORIGIN}',
      openapi: {
        url: '/documentation/json'
      }
    }],
    refreshTimeout: 1000
  })

  // plugins and routes config is there
  assert.deepStrictEqual(composerConfig.plugins, {
    paths: [
      { path: './plugins', encapsulate: false },
      './routes'
    ]
  })
  // plugins and routes are created
  const directoriesToCheck = ['plugins', 'routes']
  for (const d of directoriesToCheck) {
    const meta = await stat(join(tmpDir, d))
    assert.deepStrictEqual(meta.isDirectory(), true)
  }
})

test('creates composer in a runtime context', async () => {
  const params = {
    isRuntimeContext: true,
    servicesToCompose: ['service1', 'service2'],
    hostname: 'myhost',
    port: 6666,
    typescript: false
  }

  await createComposer(params, fakeLogger, tmpDir, undefined)

  const pathToComposerConfigFile = join(tmpDir, 'platformatic.composer.json')
  const composerConfigFile = await readFile(pathToComposerConfigFile, 'utf8')
  const composerConfig = JSON.parse(composerConfigFile)
  const { server, composer } = composerConfig

  assert.strictEqual(server, undefined)

  const pathToEnvFile = join(tmpDir, '.env')
  dotenv.config({ path: pathToEnvFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, undefined)
  assert.strictEqual(process.env.PORT, undefined)
  process.env = {}

  const pathToEnvSampleFile = join(tmpDir, '.env.sample')
  dotenv.config({ path: pathToEnvSampleFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, undefined)
  assert.strictEqual(process.env.PORT, undefined)

  assert.equal(composer, {
    services: [
      {
        id: 'service1',
        openapi: {
          url: '/documentation/json',
          prefix: '/service1'
        }
      },
      {
        id: 'service2',
        openapi: {
          url: '/documentation/json',
          prefix: '/service2'
        }
      }
    ],
    refreshTimeout: 1000
  })
})
