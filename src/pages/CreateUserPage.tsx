import CreateUserForm from '../features/users/CreateUserForm'

/**
 * Admin-only page for creating users. Mounted behind <AdminRoute> at
 * /users/new, inside the authenticated AppLayout (so it keeps the nav shell).
 */
export default function CreateUserPage() {
  return (
    <div data-testid="create-user-page" className="page page--narrow">
      <header className="page__header">
        <h1>Create user</h1>
        <p className="page__subtitle">
          Add a new account. Enable “admin” to grant full superuser access.
        </p>
      </header>
      <div className="panel">
        <CreateUserForm />
      </div>
    </div>
  )
}
