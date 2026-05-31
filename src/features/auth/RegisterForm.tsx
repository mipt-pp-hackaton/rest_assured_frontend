import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../../api/authApi'
import { ApiError } from '../../api/errors'

/**
 * Self-contained registration form: owns its field state, runs client-side
 * validation before any network call, fires the register mutation, and on a
 * 201 navigates to "/login".
 *
 * SECURITY: the request payload is constructed as `{ email, password }` only —
 * `is_superuser` is never included, so a normal user cannot self-grant
 * superuser by tampering with the form.
 */

// Pragmatic email shape check: a non-empty local part, an "@", and a dotted
// domain. Good enough to block obvious garbage before hitting the server.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MIN_PASSWORD = 8
const MAX_PASSWORD = 72

// Defensive cap on server-supplied 422 messages before they hit state/render,
// so a hostile/oversized `detail[].msg` cannot blow up the UI.
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

export default function RegisterForm() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [pending, setPending] = useState(false)

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validation = validate()
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    setErrors({})
    setPending(true)
    try {
      // SECURITY: omit is_superuser entirely — only email + password.
      await register({ email, password })
      navigate('/login')
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
        setErrors({ global: 'Registration failed. Please try again.' })
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="form" data-testid="register-form">
      <div className="form-field">
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? 'register-email-error' : undefined}
          data-testid="register-email"
        />
        {errors.email && (
          <p id="register-email-error" role="alert" className="form-error" data-testid="register-email-error">
            {errors.email}
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={
            errors.password ? 'register-password-error' : undefined
          }
          data-testid="register-password"
        />
        {errors.password && (
          <p
            id="register-password-error"
            role="alert"
            className="form-error"
            data-testid="register-password-error"
          >
            {errors.password}
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="register-confirm">Confirm Password</label>
        <input
          id="register-confirm"
          name="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={errors.confirm ? true : undefined}
          aria-describedby={
            errors.confirm ? 'register-confirm-error' : undefined
          }
          data-testid="register-confirm"
        />
        {errors.confirm && (
          <p
            id="register-confirm-error"
            role="alert"
            className="form-error"
            data-testid="register-confirm-error"
          >
            {errors.confirm}
          </p>
        )}
      </div>

      {errors.global && (
        <p role="alert" className="alert alert--error" data-testid="register-error">
          {errors.global}
        </p>
      )}

      <button type="submit" className="btn btn--primary" disabled={pending} data-testid="register-submit">
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
