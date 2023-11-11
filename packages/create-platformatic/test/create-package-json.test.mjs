import { before, after, test } from 'node:test'
import { tmpdir } from 'os'
import { isFileAccessible } from '../src/utils.mjs'
import { createPackageJson } from '../src/create-package-json.mjs'
import { join } from 'path'
import { mkdtemp, readFile, rm } from 'fs/promises'
import assert from 'node:assert'

let log = ''
const fakeLogger = {
  debug: msg => { log = msg }
}

let tmpDir
before(async () => {
  log = ''
  tmpDir = await mkdtemp(join(tmpdir(), 'test-create-platformatic-'))
})

after(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

test('creates package.json file for db project', async () => {
  const version = '1.2.3'
  const fastifyVersion = '4.5.6'
  const addTSBuild = false
  const scripts = {}
  const dependencies = {
    '@platformatic/db': `^${version}`
  }
  await createPackageJson(
    version,
    fastifyVersion,
    fakeLogger,
    tmpDir,
    addTSBuild,
    scripts,
    dependencies
  )
  assert.strictEqual(log, `${join(tmpDir, 'package.json')} successfully created.`)
  const accessible = await isFileAccessible(join(tmpDir, 'package.json'))
  assert.strictEqual(accessible, true)
  const packageJson = JSON.parse(await readFile(join(tmpDir, 'package.json'), 'utf8'))
  assert.strictEqual(packageJson.scripts.start, 'platformatic start')
  assert.strictEqual(packageJson.scripts.build, undefined)
  assert.strictEqual(packageJson.dependencies.platformatic, `^${version}`)
  assert.strictEqual(packageJson.dependencies['@platformatic/db'], `^${version}`)
  assert.strictEqual(packageJson.devDependencies.fastify, `^${fastifyVersion}`)
})

test('creates package.json file for service project', async () => {
  const version = '1.2.3'
  const fastifyVersion = '4.5.6'
  const addTSBuild = false
  const devDependencies = {
    typescript: '^5.2.2'
  }
  await createPackageJson(version, fastifyVersion, fakeLogger, tmpDir, addTSBuild, {}, {}, devDependencies)
  assert.strictEqual(log, `${join(tmpDir, 'package.json')} successfully created.`)
  const accessible = await isFileAccessible(join(tmpDir, 'package.json'))
  assert.strictEqual(accessible, true)
  const packageJson = JSON.parse(await readFile(join(tmpDir, 'package.json'), 'utf8'))
  assert.strictEqual(packageJson.scripts.start, 'platformatic start')
  assert.strictEqual(packageJson.dependencies.platformatic, `^${version}`)
  assert.strictEqual(packageJson.devDependencies.fastify, `^${fastifyVersion}`)
  assert.strictEqual(packageJson.devDependencies.typescript, '^5.2.2')
})

test('creates package.json file with TS build', async () => {
  const version = '1.2.3'
  const fastifyVersion = '4.5.6'
  const addTSBuild = true
  await createPackageJson(version, fastifyVersion, fakeLogger, tmpDir, addTSBuild)
  assert.strictEqual(log, `${join(tmpDir, 'package.json')} successfully created.`)
  const accessible = await isFileAccessible(join(tmpDir, 'package.json'))
  assert.strictEqual(accessible, true)
  const packageJson = JSON.parse(await readFile(join(tmpDir, 'package.json'), 'utf8'))
  assert.strictEqual(packageJson.scripts.start, 'platformatic start')
  assert.strictEqual(packageJson.scripts.clean, 'rm -fr ./dist')
  assert.strictEqual(packageJson.scripts.build, 'platformatic compile')
  assert.strictEqual(packageJson.dependencies.platformatic, `^${version}`)
  assert.strictEqual(packageJson.devDependencies.fastify, `^${fastifyVersion}`)
})
