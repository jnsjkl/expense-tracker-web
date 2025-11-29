import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/Dashboard'

export default async function Home() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Security Check: Email Allowlist
    // Get allowed users from environment variable (Server-side only)
    const allowedUsers = process.env.ALLOWED_USERS?.split(',') || []

    // Clean up emails (trim whitespace)
    const cleanAllowedUsers = allowedUsers.map(email => email.trim())

    if (!cleanAllowedUsers.includes(user.email || '')) {
        redirect('/unauthorized')
    }

    return <Dashboard user={user} />
}
