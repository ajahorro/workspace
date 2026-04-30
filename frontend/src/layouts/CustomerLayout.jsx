import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import BookingCartSidebar from '../components/Customer/BookingCartSidebar';

const CustomerLayout = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { cart } = useBooking();
  const { user, signOut } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <header style={{ padding: '1rem 2rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.05em' }}>RENEW<span style={{ color: 'var(--primary-color)' }}>.</span></h1>
        </Link>
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: '500' }}>Services</Link>
          <Link to="/my-bookings" style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: '500' }}>My Bookings</Link>
          
          {user ? (
            <button 
              onClick={() => signOut()}
              style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '2rem', cursor: 'pointer', fontWeight: '500' }}
            >
              Logout
            </button>
          ) : (
            <Link 
              to="/login"
              style={{ background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', padding: '0.5rem 1rem', borderRadius: '2rem', cursor: 'pointer', fontWeight: '600', textDecoration: 'none' }}
            >
              Login
            </Link>
          )}
          
          <button 
            onClick={() => setIsCartOpen(true)}
            style={{ 
              background: 'var(--primary-color)', 
              border: 'none', 
              padding: '0.5rem 1rem', 
              borderRadius: '2rem', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '600',
              color: '#000'
            }}
          >
            <ShoppingBag size={18} />
            {cart.length > 0 && <span>{cart.length}</span>}
          </button>
        </nav>
      </header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <BookingCartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

export default CustomerLayout;
