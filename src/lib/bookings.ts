import { supabase } from './supabase';

export interface Booking {
  id: string;
  student_id: string;
  hostel_id: string;
  check_in_date: string;
  check_out_date: string;
  number_of_nights: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  special_requests?: string;
  created_at: string;
  updated_at: string;
}

function validateUUID(value: any, fieldName: string): string {
  if (!value || typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return value;
}

function validateDate(value: any, fieldName: string): string {
  if (!value || typeof value !== 'string') {
    throw new Error(`${fieldName} must be a valid date string`);
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }
  return value;
}

function validateBookingStatus(value: any): Booking['status'] {
  const validStatuses = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled'];
  if (!validStatuses.includes(value)) {
    throw new Error('Invalid booking status');
  }
  return value;
}

export async function getStudentBookings(studentId: string) {
  validateUUID(studentId, 'Student ID');

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      hostels:hostel_id(name, location, price_per_night)
    `)
    .eq('student_id', studentId)
    .order('check_in_date', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch bookings');
  }

  return data || [];
}

export async function getHostelBookings(hostelId: string) {
  validateUUID(hostelId, 'Hostel ID');

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      user_profiles:student_id(full_name, email)
    `)
    .eq('hostel_id', hostelId)
    .order('check_in_date', { ascending: true });

  if (error) {
    throw new Error('Failed to fetch bookings');
  }

  return data || [];
}

export async function createBooking(booking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>) {
  validateUUID(booking.student_id, 'Student ID');
  validateUUID(booking.hostel_id, 'Hostel ID');
  validateDate(booking.check_in_date, 'Check-in date');
  validateDate(booking.check_out_date, 'Check-out date');

  if (new Date(booking.check_out_date) <= new Date(booking.check_in_date)) {
    throw new Error('Check-out date must be after check-in date');
  }

  if (booking.number_of_nights < 1 || !Number.isInteger(booking.number_of_nights)) {
    throw new Error('Number of nights must be a positive integer');
  }

  if (booking.total_price <= 0 || booking.total_price > 1000000) {
    throw new Error('Total price must be between 0 and 1,000,000');
  }

  validateBookingStatus(booking.status);

  if (booking.special_requests && booking.special_requests.length > 1000) {
    throw new Error('Special requests must not exceed 1000 characters');
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([booking])
    .select();

  if (error) {
    throw new Error('Failed to create booking');
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to create booking');
  }

  return data[0];
}

export async function updateBookingStatus(bookingId: string, status: Booking['status']) {
  validateUUID(bookingId, 'Booking ID');
  validateBookingStatus(status);

  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)
    .select();

  if (error) {
    throw new Error('Failed to update booking');
  }

  if (!data || data.length === 0) {
    throw new Error('Booking not found');
  }

  return data[0];
}

export async function cancelBooking(bookingId: string) {
  return updateBookingStatus(bookingId, 'cancelled');
}
