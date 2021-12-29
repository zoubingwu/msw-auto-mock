export const browserMockTemplate = (
  handlersCode: string
) => `import { setupWorker, rest } from 'msw'
import faker from 'faker'

const handlers = [
  ${handlersCode}
]

// This configures a Service Worker with the given request handlers.
const worker = setupWorker(...handlers)

worker.start()
`;
