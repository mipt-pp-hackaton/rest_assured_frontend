import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export default function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav>
      <Link to="/">Dashboard</Link>
      <Link to="/services">Services</Link>
      <Link to="/incidents">Incidents</Link>
      {user?.email ? <span>{user.email}</span> : null}
      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </nav>
  )
}
