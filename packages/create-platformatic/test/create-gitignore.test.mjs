import { before, after, test } from 'node:test'
import { tmpdir } from 'os'
import { isFileAccessible } from '../src/utils.mjs'
import { createGitignore } from '../src/create-gitignore.mjs'
import { join } from 'path'
import { mkdtemp, rm } from 'fs/promises'
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

test('creates gitignore file', async () => {
  await createGitignore(fakeLogger, tmpDir)
  assert.strictEqual(
    log,
    `Gitignore file ${join(tmpDir, '.gitignore')} successfully created.`
  )
  const accessible = await isFileAccessible(join(tmpDir, '.gitignore'))
  assert.strictEqual(accessible, true)
})
