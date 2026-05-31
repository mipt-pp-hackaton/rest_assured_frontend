import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { ApiError } from '../../api/errors'

/**
 * Credential login form. Exposes a single identity field labeled "Email" whose
 * value is passed as the OAuth2 `username` to `auth.login()`. On success it
 * navigates to "/"; on a 401 it surfaces an inline "Invalid credentials" error.
 */
export function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const emailId = useId()
  const passwordId = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const nextEmailError = email ? null : 'Email is required'
    const nextPasswordError = password ? null : 'Password is required'
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)

    if (nextEmailError || nextPasswordError) {
      return
    }

    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      // 401 → exact credential error. Any other failure (network, 5xx, etc.)
      // surfaces a safe generic message instead of bubbling up; we never leak
      // server internals and never navigate on failure.
      if (err instanceof ApiError && err.status === 401) {
        setFormError('Invalid credentials')
        return
      }
      setFormError('Something went wrong. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor={emailId}>Email</label>
        <input
          id={emailId}
          type="email"
          data-testid="login-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? `${emailId}-error` : undefined}
        />
        {emailError && (
          <p id={`${emailId}-error`} role="alert" data-testid="login-email-error">
            {emailError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={passwordId}>Password</label>
        <input
          id={passwordId}
          type="password"
          data-testid="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? `${passwordId}-error` : undefined}
        />
        {passwordError && (
          <p
            id={`${passwordId}-error`}
            role="alert"
            data-testid="login-password-error"
          >
            {passwordError}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" data-testid="login-error">
          {formError}
        </p>
      )}

      <button type="submit" data-testid="login-submit">
        Sign in
      </button>
    </form>
  )
}
