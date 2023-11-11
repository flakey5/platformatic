import createService from '../../src/service/create-service.mjs'
import { isFileAccessible } from '../../src/utils.mjs'
import { test, before, after } from 'node:test'
import assert from 'node:assert'
import { tmpdir } from 'os'
import { readFile, rm, mkdtemp } from 'fs/promises'
import { join } from 'path'
import dotenv from 'dotenv'
import Ajv from 'ajv'
import { schema } from '@platformatic/service'

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
  info: msg => log.push(msg),
  warn: msg => log.push(msg)
}

test('creates service with typescript', async () => {
  const params = {
    hostname: 'myhost',
    port: 6666,
    typescript: true
  }

  await createService(params, fakeLogger, tmpDir)

  const pathToServiceConfigFile = join(tmpDir, 'platformatic.service.json')
  const serviceConfigFile = await readFile(pathToServiceConfigFile, 'utf8')
  const serviceConfig = JSON.parse(serviceConfigFile)
  const ajv = new Ajv()
  ajv.addKeyword('resolvePath')
  ajv.addKeyword('resolveModule')
  const validate = ajv.compile(schema.schema)
  const isValid = validate(serviceConfig)
  assert.strictEqual(isValid, true)
  const { server, plugins, watch } = serviceConfig

  assert.strictEqual(server.hostname, '{PLT_SERVER_HOSTNAME}')
  assert.strictEqual(server.port, '{PORT}')
  assert.strictEqual(watch, true)

  const pathToServiceEnvFile = join(tmpDir, '.env')
  dotenv.config({ path: pathToServiceEnvFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, 'myhost')
  assert.strictEqual(process.env.PORT, '6666')
  assert.strictEqual(process.env.PLT_TYPESCRIPT, 'true')

  process.env = {}

  const pathToServiceEnvSampleFile = join(tmpDir, '.env.sample')
  dotenv.config({ path: pathToServiceEnvSampleFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, 'myhost')
  assert.strictEqual(process.env.PORT, '6666')
  assert.strictEqual(process.env.PLT_TYPESCRIPT, 'true')

  assert.deepStrictEqual(plugins.paths, [{ path: './plugins', encapsulate: false }, './routes'])
  assert.strictEqual(plugins.typescript, '{PLT_TYPESCRIPT}')

  assert.ok(await isFileAccessible(join(tmpDir, 'tsconfig.json')))
  assert.ok(await isFileAccessible(join(tmpDir, 'plugins', 'example.ts')))
  assert.ok(await isFileAccessible(join(tmpDir, 'routes', 'root.ts')))

  assert.ok(await isFileAccessible(join(tmpDir, 'test', 'plugins', 'example.test.ts')))
  assert.ok(await isFileAccessible(join(tmpDir, 'test', 'routes', 'root.test.ts')))
  assert.ok(await isFileAccessible(join(tmpDir, 'test', 'helper.ts')))
})

test('creates service with javascript', async () => {
  const params = {
    hostname: 'myhost',
    port: 6666,
    typescript: false
  }

  await createService(params, fakeLogger, tmpDir)

  const pathToServiceConfigFile = join(tmpDir, 'platformatic.service.json')
  const serviceConfigFile = await readFile(pathToServiceConfigFile, 'utf8')
  const serviceConfig = JSON.parse(serviceConfigFile)
  const { server, plugins, watch } = serviceConfig

  assert.strictEqual(server.hostname, '{PLT_SERVER_HOSTNAME}')
  assert.strictEqual(server.port, '{PORT}')
  assert.strictEqual(watch, true)

  const pathToServiceEnvFile = join(tmpDir, '.env')
  dotenv.config({ path: pathToServiceEnvFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, 'myhost')
  assert.strictEqual(process.env.PORT, '6666')
  process.env = {}

  const pathToServiceEnvSampleFile = join(tmpDir, '.env.sample')
  dotenv.config({ path: pathToServiceEnvSampleFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, 'myhost')
  assert.strictEqual(process.env.PORT, '6666')

  assert.deepStrictEqual(plugins, { paths: [{ path: './plugins', encapsulate: false }, './routes'] })
  assert.ok(await isFileAccessible(join(tmpDir, 'plugins', 'example.js')))
  assert.ok(await isFileAccessible(join(tmpDir, 'routes', 'root.js')))

  assert.ok(await isFileAccessible(join(tmpDir, 'test', 'plugins', 'example.test.js')))
  assert.ok(await isFileAccessible(join(tmpDir, 'test', 'routes', 'root.test.js')))
  assert.ok(await isFileAccessible(join(tmpDir, 'test', 'helper.js')))
})

test('creates service in a runtime context', async () => {
  const params = {
    isRuntimeContext: true,
    hostname: 'myhost',
    port: 6666,
    typescript: false,
    runtimeContext: {
      servicesNames: ['service-a', 'service-b'],
      envPrefix: 'SERVICE_PREFIX'
    },
    staticWorkspaceGitHubAction: true,
    dynamicWorkspaceGitHubAction: true
  }

  const serviceEnv = await createService(params, fakeLogger, tmpDir)
  assert.deepStrictEqual(serviceEnv, {
    SERVICE_PREFIX_PLT_SERVER_LOGGER_LEVEL: 'info',
    SERVICE_PREFIX_PORT: 6666,
    SERVICE_PREFIX_PLT_SERVER_HOSTNAME: 'myhost'
  })

  const pathToServiceConfigFile = join(tmpDir, 'platformatic.service.json')
  const serviceConfigFile = await readFile(pathToServiceConfigFile, 'utf8')
  const serviceConfig = JSON.parse(serviceConfigFile)
  const { server, plugins } = serviceConfig

  assert.strictEqual(server, undefined)

  const pathToServiceEnvFile = join(tmpDir, '.env')
  assert.equal(await readFile(pathToServiceEnvFile, 'utf8'), '') // file is empty
  const pathToServiceEnvSampleFile = join(tmpDir, '.env.sample')
  assert.equal(await readFile(pathToServiceEnvSampleFile, 'utf8'), '') // file is empty

  assert.equal(plugins, { paths: [{ path: './plugins', encapsulate: false }, './routes'] })
  assert.ok(!(await isFileAccessible(join(tmpDir, '.github', 'workflows', 'platformatic-static-workspace-deploy.yml'))))
  assert.ok(!(await isFileAccessible(join(tmpDir, '.github', 'workflows', 'platformatic-dynamic-workspace-deploy.yml'))))
  assert.ok(await isFileAccessible(join(tmpDir, 'plugins', 'example.js')))
  assert.ok(await isFileAccessible(join(tmpDir, 'routes', 'root.js')))

  assert.ok(await isFileAccessible(join(tmpDir, 'test', 'plugins', 'example.test.js')))
  assert.ok(await isFileAccessible(join(tmpDir, 'test', 'routes', 'root.test.js')))
  assert.ok(await isFileAccessible(join(tmpDir, 'test', 'helper.js')))
})
