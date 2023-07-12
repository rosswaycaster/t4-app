import { router } from './trpc'
import { helloRouter } from './routes/hello'
import { authRouter } from './routes/auth'

export const appRouter = router({
  hello: helloRouter,
  auth: authRouter,
})

export type AppRouter = typeof appRouter
