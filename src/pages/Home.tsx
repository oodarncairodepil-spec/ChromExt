import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface OrderMetricOrder {
  id: string
  status: string
  total_amount: number
  created_at: string
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const Home: React.FC = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<OrderMetricOrder[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilter, setShowFilter] = useState<boolean>(false)
  const filterRef = useRef<HTMLDivElement>(null)

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: todayStr, end: todayStr })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilter(false)
      }
    }
    if (showFilter) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilter])

  useEffect(() => {
    const load = async () => {
      if (!user) return
      try {
        setLoading(true)
        setError(null)
        const { data, error: qError } = await supabase
          .from('orders')
          .select('id,status,total_amount,created_at')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false })
        if (qError) throw qError
        setOrders((data || []).map((o: any) => ({
          id: o.id,
          status: (o.status || '').toLowerCase(),
          total_amount: Number(o.total_amount || 0),
          created_at: o.created_at
        })))
      } catch (e: any) {
        setError(e.message || 'Failed to load metrics')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const filtered = useMemo(() => {
    const startOk = dateRange.start
    const endOk = dateRange.end
    return orders.filter((o) => {
      const d = new Date(o.created_at).toISOString().split('T')[0]
      if (startOk && d < startOk) return false
      if (endOk && d > endOk) return false
      return true
    })
  }, [orders, dateRange])

  const metrics = useMemo(() => {
    const count = (s: string | string[]) => {
      const statuses = Array.isArray(s) ? s : [s]
      return filtered.filter((o) => statuses.includes(o.status)).length
    }
    const paidValue = filtered
      .filter((o) => o.status === 'paid')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const totalValue = filtered.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    return {
      draft: count('draft'),
      new: count('new'),
      paid: count('paid'),
      paidValue,
      packaged: count('packaged'),
      inDelivery: count('shipped'),
      completed: count(['completed', 'delivered']),
      paidCount: count(['paid', 'partial_paid']),
      cancelled: count(['cancelled', 'canceled']),
      totalValue
    }
  }, [filtered])

  const filterLabel = useMemo(() => {
    if (dateRange.start === todayStr && dateRange.end === todayStr) return 'Today'
    if (dateRange.start && dateRange.end) return `${dateRange.start} → ${dateRange.end}`
    if (dateRange.start) return `From ${dateRange.start}`
    if (dateRange.end) return `Until ${dateRange.end}`
    return 'All Dates'
  }, [dateRange, todayStr])

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilter((s) => !s)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
            title="Set date range"
          >
            {filterLabel}
          </button>
          {showFilter && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange((r) => ({ ...r, start: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange((r) => ({ ...r, end: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setDateRange({ start: todayStr, end: todayStr })}
                    className="px-3 py-2 text-xs text-gray-600 hover:text-gray-800"
                  >
                    Set Today
                  </button>
                  <button
                    onClick={() => setShowFilter(false)}
                    className="px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading metrics</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24">
                <text x="12" y="16" textAnchor="middle" fontSize="16" fill="currentColor">$</text>
              </svg>
            </div>
            <div className="text-sm text-gray-800">Total Value</div>
          </div>
          <div className="text-xl font-bold text-gray-900">{loading ? '—' : formatCurrency(metrics.totalValue)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                </svg>
              </div>
              <div className="text-sm text-gray-800">Draft</div>
            </div>
            <div className="border-t border-gray-100 mt-3"></div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{loading ? '—' : metrics.draft}</div>
          </div>
        <div className="card p-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                <path d="M8 9h8M8 13h8M8 17h8"></path>
              </svg>
            </div>
            <div className="text-sm text-gray-800">Unpaid</div>
          </div>
          <div className="border-t border-gray-100 mt-3"></div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{loading ? '—' : metrics.new}</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div className="text-sm text-gray-800">Paid</div>
          </div>
          <div className="border-t border-gray-100 mt-3"></div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{loading ? '—' : metrics.paidCount}</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10l9 4 9-4V7"></path>
              </svg>
            </div>
            <div className="text-sm text-gray-800">Packaged</div>
          </div>
          <div className="border-t border-gray-100 mt-3"></div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{loading ? '—' : metrics.packaged}</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <g transform="translate(0,-2.4)">
                  <path d="M3 14h10v5H3z"></path>
                  <path d="M13 14h4l3 3v2h-7z"></path>
                  <circle cx="7" cy="19" r="1"></circle>
                  <circle cx="17" cy="19" r="1"></circle>
                </g>
              </svg>
            </div>
            <div className="text-sm text-gray-800">Shipped</div>
          </div>
          <div className="border-t border-gray-100 mt-3"></div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{loading ? '—' : metrics.inDelivery}</div>
        </div>

          <div className="card p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9"></circle>
                  <path d="M9 12l2 2 4-4"></path>
                </svg>
              </div>
              <div className="text-sm text-gray-800">Completed</div>
            </div>
            <div className="border-t border-gray-100 mt-3"></div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{loading ? '—' : metrics.completed}</div>
          </div>

          <div className="card p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="text-sm text-gray-800">Cancelled</div>
            </div>
            <div className="border-t border-gray-100 mt-3"></div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{loading ? '—' : metrics.cancelled}</div>
          </div>
      </div>
    </div>
  )
}

export default Home
