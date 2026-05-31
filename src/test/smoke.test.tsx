import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen } from './test-utils'
import { server } from './server'

describe('test harness smoke', () => {
  it('renders a component and asserts on the DOM', () => {
    render(<h1>Rest Assured</h1>)
    expect(screen.getByRole('heading', { name: 'Rest Assured' })).toBeInTheDocument()
  })

  it('intercepts a fetch with MSW', async () => {
    server.use(
      http.get('https://api.example.test/ping', () =>
        HttpResponse.json({ message: 'pong' }),
      ),
    )

    const response = await fetch('https://api.example.test/ping')
    const body = await response.json()

    expect(response.ok).toBe(true)
    expect(body).toEqual({ message: 'pong' })
  })
})
