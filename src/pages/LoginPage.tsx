import { Link } from 'react-router-dom'
import { LoginForm } from '../features/auth/LoginForm'

export default function LoginPage() {
  return (
    <div data-testid="login-page" className="auth-layout">
      <div className="auth-card">
        <span className="auth-card__brand">
          <span className="app-nav__mark" aria-hidden="true">◆</span>
          Rest&nbsp;Assured
        </span>
        <h1>Welcome back</h1>
        <p className="auth-card__subtitle">Sign in to your monitoring dashboard.</p>
        <LoginForm />
        <p className="auth-card__alt">
          Need an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  )
}
