import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

/**
 * Top navigation bar for the authenticated app shell. Renders the brand, the
 * primary section links, and (for superusers only) a link to the admin
 * create-user page, followed by the current user's email and a Logout action.
 */
export default function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="app-nav" aria-label="Primary">
      <Link to="/" className="app-nav__brand">
        <span className="app-nav__mark" aria-hidden="true">◆</span>
        Rest&nbsp;Assured
      </Link>

      <div className="app-nav__links">
        <NavLink to="/" end className="app-nav__link">
          Dashboard
        </NavLink>
        <NavLink to="/services" className="app-nav__link">
          Services
        </NavLink>
        <NavLink to="/incidents" className="app-nav__link">
          Incidents
        </NavLink>
        {user?.is_superuser ? (
          <NavLink to="/users/new" className="app-nav__link">
            New User
          </NavLink>
        ) : null}
      </div>

      <div className="app-nav__spacer" />

      {user?.email ? (
        <span className="app-nav__user" title={user.email}>
          {user.email}
        </span>
      ) : null}
      <button
        type="button"
        className="btn btn--ghost app-nav__logout"
        onClick={handleLogout}
      >
        Logout
      </button>
    </nav>
  )
}
