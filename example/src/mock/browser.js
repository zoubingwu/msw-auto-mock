import { setupWorker, rest } from 'msw'

const handlers = [
  // Handles a POST /login request
  rest.post('/login', null),
  // Handles a GET /user request
  rest.get('/user', null),
]

// This configures a Service Worker with the given request handlers.
export const worker = setupWorker(...handlers)