'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Transaction } from '@/types'

interface MonthlyData {
    month: string
    total: number
    transaction_count: number
}

export default function Analytics({ user }: { user: any }) {
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [supabase] = useState(() => createClient())

    useEffect(() => {
        fetchMonthlyData()
    }, [])

    useEffect(() => {
        if (selectedMonth) {
            fetchTransactionsForMonth(selectedMonth)
        }
    }, [selectedMonth])

    const fetchMonthlyData = async () => {
        const { data, error } = await supabase.rpc('get_monthly_expenses', {
            user_id_input: user.id
        })

        if (data) {
            // Sort chronologically for the chart
            const sorted = [...data].reverse()
            setMonthlyData(sorted)
            // Select the latest month by default
            if (sorted.length > 0) {
                setSelectedMonth(sorted[sorted.length - 1].month)
            }
        }
        setLoading(false)
    }

    const fetchTransactionsForMonth = async (month: string) => {
        // Calculate start and end of month
        const [year, monthNum] = month.split('-')
        const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1).toISOString()
        const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59).toISOString()

        const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .gte('date', startDate)
            .lte('date', endDate)
            .not('merchant', 'ilike', '[TEST]%') // Exclude test transactions
            .order('date', { ascending: false })

        if (data) {
            setTransactions(data)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-SG', {
            style: 'currency',
            currency: 'SGD'
        }).format(amount)
    }

    const formatMonth = (monthStr: string) => {
        const [year, month] = monthStr.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1)
        return date.toLocaleDateString('en-SG', { month: 'short', year: '2-digit' })
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Loading analytics...</div>

    return (
        <div className="space-y-8">
            {/* Chart Section */}
            <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Monthly Spending</h2>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis
                                dataKey="month"
                                tickFormatter={formatMonth}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                hide
                            />
                            <Tooltip
                                cursor={{ fill: '#f3f4f6' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [formatCurrency(value), 'Spent']}
                                labelFormatter={formatMonth}
                            />
                            <Bar
                                dataKey="total"
                                radius={[4, 4, 0, 0]}
                                onClick={(data: any) => setSelectedMonth(data.month)}
                                cursor="pointer"
                            >
                                {monthlyData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.month === selectedMonth ? '#3b82f6' : '#cbd5e1'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Selected Month Details */}
            {selectedMonth && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">
                                {new Date(selectedMonth).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}
                            </p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                {formatCurrency(monthlyData.find(m => m.month === selectedMonth)?.total || 0)}
                            </h3>
                        </div>
                        <div className="text-sm text-gray-500">
                            {transactions.length} transactions
                        </div>
                    </div>

                    <div className="space-y-3">
                        {transactions.map((txn) => (
                            <div
                                key={txn.id}
                                className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                            >
                                <div>
                                    <p className="font-semibold text-gray-800">{txn.merchant}</p>
                                    <p className="text-sm text-gray-500">
                                        {new Date(txn.date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <p className="font-bold text-gray-900">
                                    {formatCurrency(txn.amount)}
                                </p>
                            </div>
                        ))}
                        {transactions.length === 0 && (
                            <div className="text-center py-8 text-gray-400">
                                No transactions found for this month.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
