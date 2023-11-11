import { test } from 'node:test'
import assert from 'node:assert'
import * as funcs from '../create-platformatic.mjs'
test('Should export functions', async () => {
  assert.ok(funcs.createPackageJson)
  assert.ok(funcs.createGitignore)
  assert.ok(funcs.getDependencyVersion)
  assert.ok(funcs.getVersion)
})
