import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '../test/test-utils'
import { tokenStorage } from '../auth/tokenStorage'
// Import the not-yet-existing page so this suite FAILS in the RED phase.
import CreateUserPage from './CreateUserPage'

/**
 * CreateUserPage CONTRACT (RED phase) — src/pages/CreateUserPage.tsx.
 * Wraps the admin CreateUserForm and exposes data-testid="create-user-page"
 * (used by the router wiring test) plus a heading describing the action.
 */

afterEach(() => {
  tokenStorage.clear()
})

describe('CreateUserPage', () => {
  it('renders the page marker and the create-user form', () => {
    render(<CreateUserPage />)
    expect(screen.getByTestId('create-user-page')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create user/i }),
    ).toBeInTheDocument()
  })
})
