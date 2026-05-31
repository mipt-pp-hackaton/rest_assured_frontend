import { useState, type FormEvent } from 'react'
import { createUser } from '../../api/usersApi'
import { ApiError } from '../../api/errors'

/**
 * Admin-only create-user form. Owns its field state, runs client-side
 * validation before any network call, and fires the authenticated `createUser`
 * mutation. Unlike public self-registration, it exposes an "Admin" toggle that
 * forwards `is_superuser`, letting an admin create another admin.
 *
 * On success the admin STAYS on the page: a success banner names the created
 * user and the fields reset so several users can be created in a row.
 *
 * Reachable only behind <AdminRoute>, so the superuser toggle is safe to show.
 */

// Same pragmatic email shape check as the public RegisterForm.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8
const MAX_PASSWORD = 72
// Defensive cap on server-supplied 422 messages before they hit state/render.
const MAX_SERVER_MSG = 200

function truncateMsg(msg: string): string {
  return msg.length > MAX_SERVER_MSG ? msg.slice(0, MAX_SERVER_MSG) : msg
}

interface FieldErrors {
  email?: string
  password?: string
  confirm?: string
  global?: string
}

export default function CreateUserForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isSuperuser, setIsSuperuser] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (!EMAIL_RE.test(email)) {
      next.email = 'Enter a valid email address'
    }
    if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
      next.password = `Password must be between ${MIN_PASSWORD} and ${MAX_PASSWORD} characters`
    }
    if (confirm !== password) {
      next.confirm = 'Passwords do not match'
    }
    return next
  }

  function resetFields() {
    setEmail('')
    setPassword('')
    setConfirm('')
    setIsSuperuser(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSuccess(null)

    const validation = validate()
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    setErrors({})
    setPending(true)
    try {
      const created = await createUser({ email, password, is_superuser: isSuperuser })
      setSuccess(
        `User ${created.email} created${created.is_superuser ? ' as an admin' : ''}.`,
      )
      resetFields()
    } catch (err) {
      if (err instanceof ApiError && err.detail && err.detail.length > 0) {
        const next: FieldErrors = {}
        for (const item of err.detail) {
          const field = item.loc[item.loc.length - 1]
          const msg = truncateMsg(item.msg)
          if (field === 'email') {
            next.email = msg
          } else if (field === 'password') {
            next.password = msg
          } else {
            next.global = next.global ? `${next.global} ${msg}` : msg
          }
        }
        setErrors(next)
      } else {
        setErrors({ global: 'Could not create the user. Please try again.' })
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="form" data-testid="create-user-form">
      {success && (
        <p role="status" className="alert alert--success" data-testid="create-user-success">
          {success}
        </p>
      )}

      <div className="form-field">
        <label htmlFor="create-user-email">Email</label>
        <input
          id="create-user-email"
          name="email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? 'create-user-email-error' : undefined}
          data-testid="create-user-email"
        />
        {errors.email && (
          <p id="create-user-email-error" role="alert" className="form-error" data-testid="create-user-email-error">
            {errors.email}
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="create-user-password">Password</label>
        <input
          id="create-user-password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? 'create-user-password-error' : undefined}
          data-testid="create-user-password"
        />
        {errors.password && (
          <p id="create-user-password-error" role="alert" className="form-error" data-testid="create-user-password-error">
            {errors.password}
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="create-user-confirm">Confirm Password</label>
        <input
          id="create-user-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={errors.confirm ? true : undefined}
          aria-describedby={errors.confirm ? 'create-user-confirm-error' : undefined}
          data-testid="create-user-confirm"
        />
        {errors.confirm && (
          <p id="create-user-confirm-error" role="alert" className="form-error" data-testid="create-user-confirm-error">
            {errors.confirm}
          </p>
        )}
      </div>

      <div className="form-field form-field--checkbox">
        <input
          id="create-user-admin"
          name="is_superuser"
          type="checkbox"
          checked={isSuperuser}
          onChange={(e) => setIsSuperuser(e.target.checked)}
          data-testid="create-user-admin"
        />
        <label htmlFor="create-user-admin">Grant admin (superuser) rights</label>
      </div>

      {errors.global && (
        <p role="alert" className="alert alert--error" data-testid="create-user-error">
          {errors.global}
        </p>
      )}

      <button type="submit" className="btn btn--primary" disabled={pending} data-testid="create-user-submit">
        {pending ? 'Creating…' : 'Create user'}
      </button>
    </form>
  )
}
