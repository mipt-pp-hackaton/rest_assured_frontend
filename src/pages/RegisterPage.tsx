import { Link } from 'react-router-dom'
import RegisterForm from '../features/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div data-testid="register-page" className="auth-layout">
      <div className="auth-card">
        <span className="auth-card__brand">
          <span className="app-nav__mark" aria-hidden="true">◆</span>
          Rest&nbsp;Assured
        </span>
        <h1>Create your account</h1>
        <p className="auth-card__subtitle">Start monitoring your services in minutes.</p>
        <RegisterForm />
        <p className="auth-card__alt">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
