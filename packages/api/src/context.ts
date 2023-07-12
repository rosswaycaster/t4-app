import { type inferAsyncReturnType } from '@trpc/server'
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import { type Database } from '@t4/supabase'
import jwt from '@tsndr/cloudflare-worker-jwt'

interface User {
  id: string
  supabase: SupabaseClient<Database>
}

interface ApiContextProps {
  user: User | null
  supabaseAdmin: SupabaseClient<Database>
}

export const createContext = async (
  SUPABASE_URL: string,
  SUPABASE_SECRET_KEY: string,
  JWT_VERIFICATION_KEY: string,
  opts: FetchCreateContextFnOptions
): Promise<ApiContextProps> => {
  // Create a Supabase client using SUPABASE_URL and SUPABASE_SECRET_KEY
  const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY)

  async function getUser() {
    const sessionToken = opts.req.headers.get('authorization')?.split(' ')[1]

    if (sessionToken) {
      if (!JWT_VERIFICATION_KEY) {
        console.error('JWT_VERIFICATION_KEY is not set')
        return null
      }

      try {
        const authorized = await jwt.verify(sessionToken, JWT_VERIFICATION_KEY, {
          algorithm: 'HS256',
        })
        if (!authorized) {
          return null
        }

        const decodedToken = jwt.decode(sessionToken)

        // Check if token is expired
        const expirationTimestamp = decodedToken.payload.exp
        const currentTimestamp = Math.floor(Date.now() / 1000)
        if (!expirationTimestamp || expirationTimestamp < currentTimestamp) {
          return null
        }

        const userId = decodedToken?.payload?.sub

        if (userId) {
          // Create a Supabase client using SUPABASE_URL and the user's JWT
          const supabase = createClient<Database>(SUPABASE_URL, sessionToken)
          return {
            id: userId,
            supabase,
          }
        }
      } catch (e) {
        console.error(e)
      }
    }

    return null
  }

  const user = await getUser()

  return { user, supabaseAdmin }
}

export type Context = inferAsyncReturnType<typeof createContext>
