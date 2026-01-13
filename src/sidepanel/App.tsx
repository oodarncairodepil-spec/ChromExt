import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { PermissionProvider, usePermissions } from '../contexts/PermissionContext'
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
import TokenConfirmation from '../pages/TokenConfirmation'
import ProductDetail from '../pages/ProductDetail'
import ProductCreate from '../pages/ProductCreate'
import BulkProductCreate from '../pages/BulkProductCreate'
import UserDetail from '../pages/UserDetail'
import StaffManagement from '../pages/StaffManagement'
import ProtectedRoute from '../components/ProtectedRoute'
import UserCreate from '../pages/UserCreate'
import TemplateDetail from '../pages/TemplateDetail'
import TemplateCreate from '../pages/TemplateCreate'
import Profile from '../pages/Profile'
import PaymentMethod from '../pages/PaymentMethod'
import ShippingCourier from '../pages/ShippingCourier'
import Integration from '../pages/Integration'
import Test from '../pages/Test'
import AuthCallback from '../pages/AuthCallback'
import Loading from '../components/Loading'

export type TabType = 'home' | 'products' | 'orders' | 'templates' | 'cart'

const AuthenticatedApp: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user, loading, signOut } = useAuth()
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const location = useLocation()
  const navigate = useNavigate()

  if (loading || permissionsLoading) {
    return <Loading />
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/token-confirmation" element={<TokenConfirmation />} />
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
    <div className="min-h-screen w-full bg-gray-50 flex flex-col transition-all duration-300">
      <Header 
        isCollapsed={isCollapsed} 
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        user={user}
        onSignOut={signOut}
      />
      
      <main className={`flex-1 transition-all duration-300 pb-16 ${
        isCollapsed ? 'p-2' : 'p-4'
      }`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/products" element={
            <ProtectedRoute permission="can_view_products">
              <Products />
            </ProtectedRoute>
          } />
          <Route path="/products/create" element={
            <ProtectedRoute permission="can_create_products">
              <ProductCreate />
            </ProtectedRoute>
          } />
          <Route path="/products/bulk-create" element={
            <ProtectedRoute permission="can_bulk_create_products">
              <BulkProductCreate />
            </ProtectedRoute>
          } />
          <Route path="/products/:id" element={
            <ProtectedRoute permission="can_view_products">
              <ProductDetail />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute permission="can_view_users">
              <Users />
            </ProtectedRoute>
          } />
          <Route path="/users/create" element={
            <ProtectedRoute permission="can_view_users">
              <UserCreate />
            </ProtectedRoute>
          } />
          <Route path="/users/:id" element={
            <ProtectedRoute permission="can_view_users">
              <UserDetail />
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute permission="can_view_orders">
              <Orders />
            </ProtectedRoute>
          } />
          <Route path="/orders/:id" element={
            <ProtectedRoute permission="can_view_orders">
              <OrderDetail />
            </ProtectedRoute>
          } />

          <Route path="/templates" element={
            <ProtectedRoute permission="can_view_templates">
              <Templates />
            </ProtectedRoute>
          } />
          <Route path="/templates/create" element={
            <ProtectedRoute permission="can_create_templates">
              <TemplateCreate />
            </ProtectedRoute>
          } />
          <Route path="/templates/:id" element={
            <ProtectedRoute permission="can_view_templates">
              <TemplateDetail />
            </ProtectedRoute>
          } />
          <Route path="/cart" element={
            <ProtectedRoute permission="can_view_cart">
              <Cart />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute permission="can_access_profile">
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/payment-method" element={
            <ProtectedRoute permission="can_access_payment_methods">
              <PaymentMethod />
            </ProtectedRoute>
          } />
          <Route path="/shipping-courier" element={
            <ProtectedRoute permission="can_access_shipping_courier">
              <ShippingCourier />
            </ProtectedRoute>
          } />
          <Route path="/integration" element={
            <ProtectedRoute permission="can_access_integration">
              <Integration />
            </ProtectedRoute>
          } />
          <Route path="/staff" element={
            <ProtectedRoute requireOwner={true}>
              <StaffManagement />
            </ProtectedRoute>
          } />
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
      <PermissionProvider>
      <Router>
        <AuthenticatedApp />
      </Router>
      </PermissionProvider>
    </AuthProvider>
  )
}

export default App