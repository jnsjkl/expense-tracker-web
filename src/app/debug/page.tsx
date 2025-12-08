'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
    const [transactions, setTransactions] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (user) {
                const { data } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('date', { ascending: false })

                setTransactions(data || [])
            }
            setLoading(false)
        }
        init()
    }, [])

    if (loading) return <div className="p-8">Loading debug data...</div>

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Debug: All Transactions</h1>
            <div className="mb-4">
                <p><strong>User ID:</strong> {user?.id}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Total Transactions:</strong> {transactions.length}</p>
            </div>

            <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border p-2 text-left">Date (UTC)</th>
                        <th className="border p-2 text-left">Merchant</th>
                        <th className="border p-2 text-right">Amount</th>
                        <th className="border p-2 text-left">Bank</th>
                        <th className="border p-2 text-left">Raw ID</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50">
                            <td className="border p-2">{t.date}</td>
                            <td className="border p-2 font-mono">{t.merchant}</td>
                            <td className="border p-2 text-right">{t.amount}</td>
                            <td className="border p-2">{t.bank}</td>
                            <td className="border p-2 text-xs text-gray-500">{t.id}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
