import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner';
import type { User, Session } from '@supabase/supabase-js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';

export type BookingStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type VehicleStatus =
  | 'pending'
  | 'washing'
  | 'detailing'
  | 'drying'
  | 'quality_check'
  | 'completed';

export type PaymentStatus = 'pending' | 'for_verification' | 'paid' | 'refunded';

export type VehicleType = 'sedan' | 'suv' | 'van' | 'motorcycle';

// Database Types
export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  base_duration_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServicePricing {
  id: string;
  service_id: string;
  vehicle_type: VehicleType;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  appointment_datetime: string;
  status: BookingStatus;
  total_amount: number;
  notes: string | null;
  assigned_staff_id: string | null;
  resource_id: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: Profile;
  assigned_staff?: Profile;
  vehicles?: BookingVehicle[];
  payment?: Payment;
}

export interface BookingVehicle {
  id: string;
  booking_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  license_plate: string;
  vehicle_type: VehicleType;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
  // Relations
  services?: BookingVehicleService[];
}

export interface BookingVehicleService {
  id: string;
  booking_vehicle_id: string;
  service_id: string;
  vehicle_type: VehicleType;
  price_at_booking: number;
  created_at: string;
  // Relations
  service?: Service;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  payment_method: string;
  status: PaymentStatus;
  reference_number: string | null;
  receipt_url: string | null;
  verified_at: string | null;
  verified_by: string | null;
  refund_reason: string | null;
  refunded_at: string | null;
  refunded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  // Relations
  sender?: Profile;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================================================
// CONTEXT TYPE
// ============================================================================

export interface AppContextType {
  // Auth State
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;

  // Data State
  bookings: Booking[];
  services: Service[];
  servicePricing: ServicePricing[];
  notifications: Notification[];
  profiles: Profile[]; // For admin/staff management

  // Auth Methods
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: Partial<Profile>) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;

  // Booking Methods
  createBooking: (bookingData: {
    appointment_datetime: string;
    vehicles: Array<{
      vehicle_make: string;
      vehicle_model: string;
      vehicle_year: number;
      license_plate: string;
      vehicle_type: VehicleType;
      services: string[]; // service IDs
    }>;
    notes?: string;
  }) => Promise<Booking>;
  cancelBooking: (bookingId: string, reason: string) => Promise<void>;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  assignStaffToBooking: (bookingId: string, staffId: string) => Promise<void>;
  getBookingById: (bookingId: string) => Promise<Booking | null>;

  // Vehicle Methods
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => Promise<void>;

  // Payment Methods
  uploadPaymentReceipt: (bookingId: string, file: File) => Promise<void>;
  verifyPayment: (paymentId: string) => Promise<void>;
  refundPayment: (paymentId: string, reason: string) => Promise<void>;

  // Message Methods
  sendMessage: (bookingId: string, message: string) => Promise<void>;
  getMessagesForBooking: (bookingId: string) => Promise<BookingMessage[]>;

  // Notification Methods
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  unreadNotificationCount: number;

  // Admin Methods
  getAllUsers: () => Promise<Profile[]>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  toggleUserActive: (userId: string) => Promise<void>;
  getAuditLogs: (filters?: { entityType?: string; userId?: string }) => Promise<AuditLog[]>;

  // Data Refresh
  refreshData: (silent?: boolean) => Promise<void>;
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [servicePricing, setServicePricing] = useState<ServicePricing[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  useEffect(() => {
    // Initialize auth session
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession) {
          setUser(currentSession.user);
          setSession(currentSession);

          // Fetch profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (profileData) {
            setProfile(profileData);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (profileData) {
            setProfile(profileData);
          }
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const refreshData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);

    try {
      // Parallel fetch all data
      const [
        servicesRes,
        pricingRes,
        bookingsRes,
        notificationsRes,
        profilesRes
      ] = await Promise.all([
        supabase.from('services').select('*').eq('is_active', true),
        supabase.from('service_pricing').select('*'),
        user ? supabase.from('bookings').select(`
          *,
          customer:profiles!bookings_customer_id_fkey(*),
          assigned_staff:profiles!bookings_assigned_staff_id_fkey(*),
          vehicles:booking_vehicles(*,
            services:booking_vehicle_services(*, service:services(*))
          ),
          payment:payments(*)
        `).order('created_at', { ascending: false }) : { data: [] },
        user ? supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }) : { data: [] },
        profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN'
          ? supabase.from('profiles').select('*')
          : { data: [] }
      ]);

      if (servicesRes.data) setServices(servicesRes.data);
      if (pricingRes.data) setServicePricing(pricingRes.data);
      if (bookingsRes.data) {
        // Filter bookings based on role
        let filteredBookings = bookingsRes.data;

        if (profile?.role === 'CUSTOMER') {
          filteredBookings = bookingsRes.data.filter(b => b.customer_id === user?.id);
        } else if (profile?.role === 'STAFF') {
          filteredBookings = bookingsRes.data.filter(b => b.assigned_staff_id === user?.id);
        }

        setBookings(filteredBookings);
      }
      if (notificationsRes.data) setNotifications(notificationsRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
    } catch (error) {
      console.error('Error refreshing data:', error);
      if (!silent) toast.error('Failed to refresh data');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [user, profile?.role]);

  // Auto-refresh data when user logs in
  useEffect(() => {
    if (user && profile) {
      refreshData(true);
    }
  }, [user, profile, refreshData]);

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  useEffect(() => {
    if (!user) return;

    // Subscribe to bookings changes
    const bookingsChannel = supabase
      .channel('bookings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        refreshData(true);
      })
      .subscribe();

    // Subscribe to notifications
    const notificationsChannel = supabase
      .channel('notifications_changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
          toast.info(payload.new.title as string);
        }
      )
      .subscribe();

    return () => {
      bookingsChannel.unsubscribe();
      notificationsChannel.unsubscribe();
    };
  }, [user, refreshData]);

  // ============================================================================
  // AUTO-CANCELLATION ENGINE
  // ============================================================================

  useEffect(() => {
    if (!bookings.length) return;

    const checkNoShows = async () => {
      const now = new Date();
      const gracePeriod = 30 * 60 * 1000; // 30 minutes in milliseconds

      for (const booking of bookings) {
        if (booking.status !== 'confirmed') continue;

        const appointmentTime = new Date(booking.appointment_datetime);
        const timeSinceAppointment = now.getTime() - appointmentTime.getTime();

        // If more than 30 minutes past appointment time
        if (timeSinceAppointment > gracePeriod) {
          try {
            await supabase
              .from('bookings')
              .update({
                status: 'no_show',
                cancellation_reason: 'Auto-cancelled: No-show (30-min grace period expired)',
                cancelled_at: now.toISOString(),
                updated_at: now.toISOString()
              })
              .eq('id', booking.id);

            // Create notification for customer
            await supabase.from('notifications').insert({
              user_id: booking.customer_id,
              title: 'Booking Auto-Cancelled',
              message: `Your booking on ${new Date(booking.appointment_datetime).toLocaleString()} was automatically cancelled due to no-show.`,
              type: 'booking_cancelled',
              booking_id: booking.id
            });

            console.log(`Auto-cancelled booking ${booking.id} due to no-show`);
          } catch (error) {
            console.error(`Failed to auto-cancel booking ${booking.id}:`, error);
          }
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkNoShows, 60000);

    // Initial check
    checkNoShows();

    return () => clearInterval(interval);
  }, [bookings]);

  // ============================================================================
  // AUTH METHODS
  // ============================================================================

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Welcome back!');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      throw error;
    }
  };

  const register = async (email: string, password: string, userData: Partial<Profile>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) throw error;

      if (data.user) {
        // Update profile with additional data
        await supabase
          .from('profiles')
          .update({
            first_name: userData.first_name,
            last_name: userData.last_name,
            phone_number: userData.phone_number
          })
          .eq('id', data.user.id);
      }

      toast.success('Account created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setBookings([]);
      setNotifications([]);
      setProfiles([]);
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error(error.message || 'Logout failed');
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
      throw error;
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password changed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
      throw error;
    }
  };

  // ============================================================================
  // BOOKING METHODS
  // ============================================================================

  const createBooking = async (bookingData: {
    appointment_datetime: string;
    vehicles: Array<{
      vehicle_make: string;
      vehicle_model: string;
      vehicle_year: number;
      license_plate: string;
      vehicle_type: VehicleType;
      services: string[];
    }>;
    notes?: string;
  }): Promise<Booking> => {
    if (!user) throw new Error('Not authenticated');

    try {
      // Calculate total amount
      let totalAmount = 0;
      for (const vehicle of bookingData.vehicles) {
        for (const serviceId of vehicle.services) {
          const pricing = servicePricing.find(
            p => p.service_id === serviceId && p.vehicle_type === vehicle.vehicle_type
          );
          if (pricing) totalAmount += pricing.price;
        }
      }

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: user.id,
          appointment_datetime: bookingData.appointment_datetime,
          status: 'scheduled',
          total_amount: totalAmount,
          notes: bookingData.notes || null
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create vehicles and services
      for (const vehicleData of bookingData.vehicles) {
        const { data: vehicle, error: vehicleError } = await supabase
          .from('booking_vehicles')
          .insert({
            booking_id: booking.id,
            vehicle_make: vehicleData.vehicle_make,
            vehicle_model: vehicleData.vehicle_model,
            vehicle_year: vehicleData.vehicle_year,
            license_plate: vehicleData.license_plate,
            vehicle_type: vehicleData.vehicle_type,
            status: 'pending'
          })
          .select()
          .single();

        if (vehicleError) throw vehicleError;

        // Add services
        for (const serviceId of vehicleData.services) {
          const pricing = servicePricing.find(
            p => p.service_id === serviceId && p.vehicle_type === vehicleData.vehicle_type
          );

          if (pricing) {
            await supabase.from('booking_vehicle_services').insert({
              booking_vehicle_id: vehicle.id,
              service_id: serviceId,
              vehicle_type: vehicleData.vehicle_type,
              price_at_booking: pricing.price
            });
          }
        }
      }

      // Create payment record
      await supabase.from('payments').insert({
        booking_id: booking.id,
        amount: totalAmount,
        payment_method: 'gcash',
        status: 'pending'
      });

      // Create notification for admin
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['ADMIN', 'SUPER_ADMIN']);

      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            user_id: admin.id,
            title: 'New Booking Created',
            message: `New booking from ${profile?.first_name || 'Customer'} for ${new Date(bookingData.appointment_datetime).toLocaleString()}`,
            type: 'new_booking',
            booking_id: booking.id
          });
        }
      }

      toast.success('Booking created successfully!');
      await refreshData(true);

      return booking;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create booking');
      throw error;
    }
  };

  const cancelBooking = async (bookingId: string, reason: string) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Booking cancelled');
      await refreshData(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel booking');
      throw error;
    }
  };

  const updateBookingStatus = async (bookingId: string, status: BookingStatus) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Booking status updated');
      await refreshData(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update booking status');
      throw error;
    }
  };

  const assignStaffToBooking = async (bookingId: string, staffId: string) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          assigned_staff_id: staffId,
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Notify staff
      await supabase.from('notifications').insert({
        user_id: staffId,
        title: 'New Task Assigned',
        message: 'You have been assigned to a new booking',
        type: 'staff_assigned',
        booking_id: bookingId
      });

      toast.success('Staff assigned successfully');
      await refreshData(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign staff');
      throw error;
    }
  };

  const getBookingById = async (bookingId: string): Promise<Booking | null> => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:profiles!bookings_customer_id_fkey(*),
          assigned_staff:profiles!bookings_assigned_staff_id_fkey(*),
          vehicles:booking_vehicles(*,
            services:booking_vehicle_services(*, service:services(*))
          ),
          payment:payments(*)
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching booking:', error);
      return null;
    }
  };

  // ============================================================================
  // VEHICLE METHODS
  // ============================================================================

  const updateVehicleStatus = async (vehicleId: string, status: VehicleStatus) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const { error } = await supabase
        .from('booking_vehicles')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', vehicleId);

      if (error) throw error;

      toast.success('Vehicle status updated');
      await refreshData(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update vehicle status');
      throw error;
    }
  };

  // ============================================================================
  // PAYMENT METHODS
  // ============================================================================

  const uploadPaymentReceipt = async (bookingId: string, file: File) => {
    if (!user) throw new Error('Not authenticated');

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${bookingId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // Update payment record
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          receipt_url: publicUrl,
          status: 'for_verification',
          updated_at: new Date().toISOString()
        })
        .eq('booking_id', bookingId);

      if (updateError) throw updateError;

      toast.success('Receipt uploaded successfully');
      await refreshData(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload receipt');
      throw error;
    }
  };

  const verifyPayment = async (paymentId: string) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          verified_at: new Date().toISOString(),
          verified_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Payment verified');
      await refreshData(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify payment');
      throw error;
    }
  };

  const refundPayment = async (paymentId: string, reason: string) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'refunded',
          refund_reason: reason,
          refunded_at: new Date().toISOString(),
          refunded_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Payment refunded');
      await refreshData(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to refund payment');
      throw error;
    }
  };

  // ============================================================================
  // MESSAGE METHODS
  // ============================================================================

  const sendMessage = async (bookingId: string, message: string) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const { error } = await supabase
        .from('booking_messages')
        .insert({
          booking_id: bookingId,
          sender_id: user.id,
          message
        });

      if (error) throw error;

      toast.success('Message sent');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
      throw error;
    }
  };

  const getMessagesForBooking = async (bookingId: string): Promise<BookingMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('booking_messages')
        .select('*, sender:profiles(*)')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };

  // ============================================================================
  // NOTIFICATION METHODS
  // ============================================================================

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error: any) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const unreadNotificationCount = notifications.filter(n => !n.is_read).length;

  // ============================================================================
  // ADMIN METHODS
  // ============================================================================

  const getAllUsers = async (): Promise<Profile[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast.error('Failed to fetch users');
      return [];
    }
  };

  const updateUserRole = async (userId: string, role: UserRole) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User role updated');
      await refreshData(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user role');
      throw error;
    }
  };

  const toggleUserActive = async (userId: string) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const targetUser = profiles.find(p => p.id === userId);
      if (!targetUser) throw new Error('User not found');

      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: !targetUser.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User ${targetUser.is_active ? 'deactivated' : 'activated'}`);
      await refreshData(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle user status');
      throw error;
    }
  };

  const getAuditLogs = async (filters?: {
    entityType?: string;
    userId?: string
  }): Promise<AuditLog[]> => {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: AppContextType = {
    // Auth State
    user,
    profile,
    session,
    isLoading,

    // Data State
    bookings,
    services,
    servicePricing,
    notifications,
    profiles,

    // Auth Methods
    login,
    register,
    logout,
    updateProfile,
    changePassword,

    // Booking Methods
    createBooking,
    cancelBooking,
    updateBookingStatus,
    assignStaffToBooking,
    getBookingById,

    // Vehicle Methods
    updateVehicleStatus,

    // Payment Methods
    uploadPaymentReceipt,
    verifyPayment,
    refundPayment,

    // Message Methods
    sendMessage,
    getMessagesForBooking,

    // Notification Methods
    markNotificationAsRead,
    markAllNotificationsAsRead,
    unreadNotificationCount,

    // Admin Methods
    getAllUsers,
    updateUserRole,
    toggleUserActive,
    getAuditLogs,

    // Data Refresh
    refreshData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
