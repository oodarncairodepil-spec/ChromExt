import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import TabBar from '../components/TabBar'
import Header from '../components/Header'
import Home from '../pages/Home'
import Products from '../pages/Products'
import Users from '../pages/Users'
import Orders from '../pages/Orders'
import OrderDetail from '../pages/OrderDetail'

import Templates from '../pages/Templates'
import Cart from '../pages/Cart'
import Login from '../pages/Login'
import Register from '../pages/Register'
import ProductDetail from '../pages/ProductDetail'
import ProductCreate from '../pages/ProductCreate'
import UserDetail from '../pages/UserDetail'
import UserCreate from '../pages/UserCreate'
import TemplateDetail from '../pages/TemplateDetail'
import TemplateCreate from '../pages/TemplateCreate'
import Profile from '../pages/Profile'
import PaymentMethod from '../pages/PaymentMethod'
import ShippingCourier from '../pages/ShippingCourier'
import Test from '../pages/Test'
import AuthCallback from '../pages/AuthCallback'
import Loading from '../components/Loading'

export type TabType = 'home' | 'products' | 'orders' | 'templates' | 'cart'

const AuthenticatedApp: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user, loading, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (loading) {
    return <Loading />
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Determine active tab based on current route
  const getActiveTab = (): TabType => {
    const path = location.pathname
    if (path.startsWith('/products')) return 'products'
    if (path.startsWith('/orders')) return 'orders'
    if (path.startsWith('/templates')) return 'templates'
    if (path.startsWith('/cart')) return 'cart'
    return 'home'
  }

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col transition-all duration-300">
      <Header 
        isCollapsed={isCollapsed} 
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        user={user}
        onSignOut={signOut}
      />
      
      <main className={`flex-1 overflow-y-auto transition-all duration-300 pb-20 ${
        isCollapsed ? 'p-2' : 'p-4'
      }`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/create" element={<ProductCreate />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/users" element={<Users />} />
          <Route path="/users/create" element={<UserCreate />} />
          <Route path="/users/:id" element={<UserDetail />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />

          <Route path="/templates" element={<Templates />} />
          <Route path="/templates/create" element={<TemplateCreate />} />
          <Route path="/templates/:id" element={<TemplateDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/payment-method" element={<PaymentMethod />} />
          <Route path="/shipping-courier" element={<ShippingCourier />} />
          <Route path="/test" element={<Test />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      
      <TabBar activeTab={getActiveTab()} onTabChange={(tab) => {
        // Navigate to the appropriate route when tab is clicked
        navigate(`/${tab === 'home' ? '' : tab}`)
      }} />
    </div>
  )
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AuthenticatedApp />
      </Router>
    </AuthProvider>
  )
}

export default App