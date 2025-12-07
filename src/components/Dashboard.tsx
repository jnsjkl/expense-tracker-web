'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction } from '@/types'
import { useRouter } from 'next/navigation'

export default function Dashboard({ user }: { user: any }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalSpent, setTotalSpent] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const init = async () => {
      // Store Gmail token for server-side syncing if present in session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.provider_token) {
        const updates: any = {
          gmail_token: session.provider_token,
          gmail_email: session.user.email
        }

        if (session.provider_refresh_token) {
          updates.gmail_refresh_token = session.provider_refresh_token
        }

        await supabase.auth.updateUser({
          data: updates
        })

        // Setup Gmail watch for push notifications
        try {
          const response = await fetch(
            'https://gmail.googleapis.com/gmail/v1/users/me/watch',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.provider_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                topicName: 'projects/expense-tracker-478916/topics/gmail-notifications',
                labelIds: ['INBOX'],
              }),
            }
          )

          if (response.ok) {
            console.log('Gmail watch setup successful')
          } else {
            console.error('Gmail watch setup failed:', await response.text())
          }
        } catch (error) {
          console.error('Error setting up Gmail watch:', error)
        }
      }
      loadData()
    }
    init()
  }, [])

  const loadData = async () => {
    setLoading(true)

    // Start Fresh: Only show transactions after this date
    const START_DATE = '2025-12-07T00:00:00.000Z' // Adjust time as needed

    // Fetch recent transactions
    const { data: txns } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', START_DATE) // Filter by start date
      .order('date', { ascending: false })
      .limit(50)

    if (txns) {
      setTransactions(txns)
      // Exclude [TEST] transactions from total
      const total = txns.reduce((sum, t) => {
        if (t.merchant.toUpperCase().startsWith('[TEST]')) return sum
        return sum + t.amount
      }, 0)
      setTotalSpent(total)
    }

    setLoading(false)
  }

  const [realtimeStatus, setRealtimeStatus] = useState<string>('')

  // Real-time updates
  useEffect(() => {
    let channel: any;

    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token)
      }

      console.log('Setting up Realtime subscription...')
      channel = supabase
        .channel('realtime transactions')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          // table: 'transactions', 
        }, (payload) => {
          console.log('Realtime event received:', payload)

          if (payload.eventType === 'INSERT') {
            const newTxn = payload.new as Transaction
            setTransactions(prev => [newTxn, ...prev])

            // Only add to total if it's NOT a test transaction
            if (!newTxn.merchant.toUpperCase().startsWith('[TEST]')) {
              setTotalSpent(prev => prev + newTxn.amount)
            }
          }
        })
        .subscribe((status) => {
          console.log('Realtime subscription status:', status)
          setRealtimeStatus(status)
        })
    }

    setupRealtime()

    return () => {
      console.log('Cleaning up Realtime subscription...')
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleResync = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Please sign in first')
        return
      }

      const response = await fetch(
        'https://fatbrfrmwmmzjtoybyis.supabase.co/functions/v1/manual-sync',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const result = await response.json()

      if (response.ok) {
        alert(`✅ Sync complete! Processed ${result.processed} transactions.`)
        loadData() // Refresh the dashboard
      } else {
        alert(`❌ Sync failed: ${result.error}`)
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <div className="flex items-center gap-2">
              <p className="text-gray-600">Hello, {user?.email?.split('@')[0] || 'User'}</p>
              <span className={`px-2 py-0.5 text-xs rounded-full ${realtimeStatus === 'SUBSCRIBED' ? 'bg-green-100 text-green-700' :
                realtimeStatus === 'CLOSED' ? 'bg-gray-100 text-gray-700' :
                  'bg-red-100 text-red-700'
                }`}>
                {realtimeStatus || 'CONNECTING'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleResync}
              className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition"
            >
              Resync
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Total Spent Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <p className="text-gray-600 mb-2">Total Spent (Recent)</p>
          <p className="text-4xl font-bold text-gray-900">
            SGD {totalSpent.toFixed(2)}
          </p>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Recent Transactions
          </h2>

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions yet. Connect your Gmail to start syncing!
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{txn.merchant}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(txn.date).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="font-bold text-red-600">
                    - ${txn.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
