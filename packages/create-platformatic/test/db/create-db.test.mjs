import createDB from '../../src/db/create-db.mjs'
import { test, before, after } from 'node:test'
import assert from 'node:assert'
import { isFileAccessible } from '../../src/utils.mjs'
import { tmpdir } from 'os'
import { join } from 'path'
import dotenv from 'dotenv'
import { schema } from '@platformatic/db'
import Ajv from 'ajv'
import { mkdtemp, readFile, rm } from 'fs/promises'

const moviesMigrationDo = `
-- Add SQL in this file to create the database tables for your API
CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL
);
`

const moviesMigrationUndo = `
-- Add SQL in this file to drop the database tables 
DROP TABLE movies;
`

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

test('creates project with no typescript', async () => {
  const params = {
    hostname: 'myhost',
    port: 6666,
    plugin: true
  }

  await createDB(params, fakeLogger, tmpDir)

  const pathToDbConfigFile = join(tmpDir, 'platformatic.db.json')
  const pathToMigrationFolder = join(tmpDir, 'migrations')
  const pathToMigrationFileDo = join(pathToMigrationFolder, '001.do.sql')
  const pathToMigrationFileUndo = join(pathToMigrationFolder, '001.undo.sql')

  const dbConfigFile = await readFile(pathToDbConfigFile, 'utf8')
  const dbConfig = JSON.parse(dbConfigFile)
  const { server, db, migrations } = dbConfig
  const ajv = new Ajv({ strict: false })
  ajv.addKeyword('relativePath')
  const validate = ajv.compile(schema)
  assert.strictEqual(validate(dbConfig), true)

  assert.strictEqual(server.hostname, '{PLT_SERVER_HOSTNAME}')
  assert.strictEqual(server.port, '{PORT}')
  assert.strictEqual(db.connectionString, '{DATABASE_URL}')
  assert.strictEqual(db.schemalock, true)

  const pathToDbEnvFile = join(tmpDir, '.env')
  dotenv.config({ path: pathToDbEnvFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, 'myhost')
  assert.strictEqual(process.env.PORT, '6666')
  assert.strictEqual(process.env.DATABASE_URL, 'sqlite://./db.sqlite')
  process.env = {}

  const pathToDbEnvSampleFile = join(tmpDir, '.env.sample')
  dotenv.config({ path: pathToDbEnvSampleFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, 'myhost')
  assert.strictEqual(process.env.PORT, '6666')
  assert.strictEqual(process.env.DATABASE_URL, 'sqlite://./db.sqlite')

  assert.strictEqual(db.graphql, true)
  assert.strictEqual(db.openapi, true)
  assert.strictEqual(migrations.dir, 'migrations')

  const migrationFileDo = await readFile(pathToMigrationFileDo, 'utf8')
  assert.strictEqual(migrationFileDo, moviesMigrationDo)
  const migrationFileUndo = await readFile(pathToMigrationFileUndo, 'utf8')
  assert.strictEqual(migrationFileUndo, moviesMigrationUndo)

  assert.strictEqual(await isFileAccessible(join(tmpDir, 'routes', 'root.js')), true)
  assert.strictEqual(await isFileAccessible(join(tmpDir, 'plugins', 'example.js')), true)
})

test('creates project with no typescript and no plugin', async () => {
  const params = {
    hostname: 'myhost',
    port: 6666,
    plugin: false,
    connectionString: 'sqlite://./custom/path/to/db.sqlite'
  }

  await createDB(params, fakeLogger, tmpDir)

  const pathToDbConfigFile = join(tmpDir, 'platformatic.db.json')
  const pathToMigrationFolder = join(tmpDir, 'migrations')
  const pathToMigrationFileDo = join(pathToMigrationFolder, '001.do.sql')
  const pathToMigrationFileUndo = join(pathToMigrationFolder, '001.undo.sql')

  const dbConfigFile = await readFile(pathToDbConfigFile, 'utf8')
  const dbConfig = JSON.parse(dbConfigFile)
  const { server, db, migrations } = dbConfig

  assert.strictEqual(server.hostname, '{PLT_SERVER_HOSTNAME}')
  assert.strictEqual(server.port, '{PORT}')
  assert.strictEqual(db.connectionString, '{DATABASE_URL}')

  const pathToDbEnvFile = join(tmpDir, '.env')
  dotenv.config({ path: pathToDbEnvFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, 'myhost')
  assert.strictEqual(process.env.PORT, '6666')
  assert.strictEqual(process.env.DATABASE_URL, 'sqlite://./custom/path/to/db.sqlite')
  process.env = {}

  const pathToDbEnvSampleFile = join(tmpDir, '.env.sample')
  dotenv.config({ path: pathToDbEnvSampleFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, 'myhost')
  assert.strictEqual(process.env.PORT, '6666')
  assert.strictEqual(process.env.DATABASE_URL, 'sqlite://./db.sqlite')

  assert.strictEqual(db.graphql, true)
  assert.strictEqual(db.openapi, true)
  assert.strictEqual(migrations.dir, 'migrations')

  const migrationFileDo = await readFile(pathToMigrationFileDo, 'utf8')
  assert.strictEqual(migrationFileDo, moviesMigrationDo)
  const migrationFileUndo = await readFile(pathToMigrationFileUndo, 'utf8')
  assert.strictEqual(migrationFileUndo, moviesMigrationUndo)

  assert.strictEqual(await isFileAccessible(join(tmpDir, 'plugin.js')), false)
})

test('creates project with no migrations', async () => {
  const params = {
    hostname: 'myhost',
    port: 6666,
    migrations: ''
  }

  await createDB(params, fakeLogger, tmpDir)

  const pathToDbConfigFile = join(tmpDir, 'platformatic.db.json')
  const dbConfigFile = await readFile(pathToDbConfigFile, 'utf8')
  const dbConfig = JSON.parse(dbConfigFile)
  const { migrations } = dbConfig

  assert.strictEqual(migrations, undefined)
})

test('creates project with typescript', async () => {
  const params = {
    hostname: 'myhost',
    port: 6666,
    typescript: true
  }

  await createDB(params, fakeLogger, tmpDir)

  const pathToDbConfigFile = join(tmpDir, 'platformatic.db.json')
  const pathToMigrationFolder = join(tmpDir, 'migrations')
  const pathToMigrationFileDo = join(pathToMigrationFolder, '001.do.sql')
  const pathToMigrationFileUndo = join(pathToMigrationFolder, '001.undo.sql')

  const dbConfigFile = await readFile(pathToDbConfigFile, 'utf8')
  const dbConfig = JSON.parse(dbConfigFile)
  const { server, db, migrations, plugins } = dbConfig

  assert.strictEqual(server.hostname, '{PLT_SERVER_HOSTNAME}')
  assert.strictEqual(server.port, '{PORT}')
  assert.strictEqual(db.connectionString, '{DATABASE_URL}')

  const pathToDbEnvFile = join(tmpDir, '.env')
  dotenv.config({ path: pathToDbEnvFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, 'myhost')
  assert.strictEqual(process.env.PORT, '6666')
  assert.strictEqual(process.env.DATABASE_URL, 'sqlite://./db.sqlite')
  assert.strictEqual(process.env.PLT_TYPESCRIPT, 'true')
  process.env = {}

  const pathToDbEnvSampleFile = join(tmpDir, '.env.sample')
  dotenv.config({ path: pathToDbEnvSampleFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, 'myhost')
  assert.strictEqual(process.env.PORT, '6666')
  assert.strictEqual(process.env.DATABASE_URL, 'sqlite://./db.sqlite')
  assert.strictEqual(process.env.PLT_TYPESCRIPT, 'true')

  assert.strictEqual(db.graphql, true)
  assert.strictEqual(db.openapi, true)
  assert.strictEqual(migrations.dir, 'migrations')

  const migrationFileDo = await readFile(pathToMigrationFileDo, 'utf8')
  assert.strictEqual(migrationFileDo, moviesMigrationDo)
  const migrationFileUndo = await readFile(pathToMigrationFileUndo, 'utf8')
  assert.strictEqual(migrationFileUndo, moviesMigrationUndo)

  assert.deepStrictEqual(plugins.paths, [{
    path: './plugins',
    encapsulate: false
  }, {
    path: './routes'
  }])
  assert.strictEqual(plugins.typescript, '{PLT_TYPESCRIPT}')
  assert.strictEqual(await isFileAccessible(join(tmpDir, 'plugins', 'example.ts')), true)
  assert.strictEqual(await isFileAccessible(join(tmpDir, 'routes', 'root.ts')), true)
  assert.strictEqual(await isFileAccessible(join(tmpDir, 'tsconfig.json')), true)
})

test('creates project with no default migrations', async () => {
  const params = {
    hostname: 'myhost',
    port: 6666,
    plugin: false,
    migrations: ''
  }
  await createDB(params, fakeLogger, tmpDir)
  assert.ok(!log.includes('Migrations folder migrations successfully created.'))
  assert.ok(!log.includes('Migration file 001.do.sql successfully created.'))
  assert.ok(!log.includes('Migration file 001.undo.sql successfully created.'))
})

test('creates project with default migrations', async () => {
  const params = {
    hostname: 'myhost',
    port: 6666,
    plugin: false,
    migrations: 'migrations'
  }
  await createDB(params, fakeLogger, tmpDir)
  assert.ok(log.includes('Migrations folder migrations successfully created.'))
  assert.ok(log.includes('Migration file 001.do.sql successfully created.'))
  assert.ok(log.includes('Migration file 001.undo.sql successfully created.'))
})

test('creates project in a runtime context', async () => {
  const params = {
    isRuntimeContext: true,
    hostname: 'myhost',
    port: 6666,
    plugin: true
  }

  await createDB(params, fakeLogger, tmpDir)

  const pathToDbConfigFile = join(tmpDir, 'platformatic.db.json')
  const pathToMigrationFolder = join(tmpDir, 'migrations')
  const pathToMigrationFileDo = join(pathToMigrationFolder, '001.do.sql')
  const pathToMigrationFileUndo = join(pathToMigrationFolder, '001.undo.sql')

  const dbConfigFile = await readFile(pathToDbConfigFile, 'utf8')
  const dbConfig = JSON.parse(dbConfigFile)
  const { server, db, migrations } = dbConfig
  const ajv = new Ajv({ strict: false })
  ajv.addKeyword('relativePath')
  const validate = ajv.compile(schema)
  assert.strictEqual(validate(dbConfig), true)

  assert.strictEqual(server, undefined)
  assert.strictEqual(db.connectionString, '{DATABASE_URL}')
  assert.strictEqual(db.schemalock, true)

  const pathToDbEnvFile = join(tmpDir, '.env')
  dotenv.config({ path: pathToDbEnvFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, undefined)
  assert.strictEqual(process.env.PORT, undefined)
  assert.strictEqual(process.env.DATABASE_URL, 'sqlite://./db.sqlite')
  process.env = {}

  const pathToDbEnvSampleFile = join(tmpDir, '.env.sample')
  dotenv.config({ path: pathToDbEnvSampleFile })
  assert.strictEqual(process.env.PLT_SERVER_HOSTNAME, undefined)
  assert.strictEqual(process.env.PORT, undefined)
  assert.strictEqual(process.env.DATABASE_URL, 'sqlite://./db.sqlite')

  assert.strictEqual(db.graphql, true)
  assert.strictEqual(db.openapi, true)
  assert.strictEqual(migrations.dir, 'migrations')

  const migrationFileDo = await readFile(pathToMigrationFileDo, 'utf8')
  assert.strictEqual(migrationFileDo, moviesMigrationDo)
  const migrationFileUndo = await readFile(pathToMigrationFileUndo, 'utf8')
  assert.strictEqual(migrationFileUndo, moviesMigrationUndo)

  assert.strictEqual(await isFileAccessible(join(tmpDir, 'routes', 'root.js')), true)
  assert.strictEqual(await isFileAccessible(join(tmpDir, 'plugins', 'example.js')), true)
})
