// ─────────────────────────────────────────
// supabase.js — cliente y helpers WalkiePup
// npm install @supabase/supabase-js
// ─────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pigxfrgtedugegsxmqkf.supabase.co';  // ← tu Project URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpZ3hmcmd0ZWR1Z2Vnc3htcWtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTcxOTYsImV4cCI6MjA5MDczMzE5Nn0.qSdwX2LBh61fLllBeGj7HRHsMRsCvicrM_ytVObzpAU';                        // ← tu anon public key
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────

export async function signUp(email, password, name, role) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  // Crea el perfil en la tabla profiles
  await supabase.from('profiles').insert({
    id: data.user.id,
    name,
    role, // 'owner' o 'walker'
  });

  return data.user;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data;
}


// ─────────────────────────────────────────
// PASEOS — Dueño
// ─────────────────────────────────────────

// Crear un paseo nuevo (queda en 'pending')
export async function createWalk({ dogId, durationMinutes, offeredPrice }) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.from('walks').insert({
    owner_id: user.id,
    dog_id: dogId,
    duration_minutes: durationMinutes,
    offered_price: offeredPrice,
    status: 'pending',
  }).select().single();

  if (error) throw error;
  return data;
}

// Escuchar en tiempo real cuando un paseador acepta
export function listenWalkUpdates(walkId, callback) {
  return supabase
    .channel(`walk-${walkId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'walks',
      filter: `id=eq.${walkId}`,
    }, payload => callback(payload.new))
    .subscribe();
}


// ─────────────────────────────────────────
// PASEOS — Paseador
// ─────────────────────────────────────────

// Ver paseos disponibles (pending) cerca — simplificado sin geo
export async function getAvailableWalks() {
  const { data, error } = await supabase
    .from('walks')
    .select(`
      *,
      owner:profiles(name, rating),
      dog:dogs(name, size)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Escuchar nuevos paseos en tiempo real
export function listenNewWalks(callback) {
  return supabase
    .channel('new-walks')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'walks',
    }, payload => callback(payload.new))
    .subscribe();
}

// Aceptar un paseo
export async function acceptWalk(walkId) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('walks')
    .update({ walker_id: user.id, status: 'accepted' })
    .eq('id', walkId)
    .eq('status', 'pending') // evita doble aceptación
    .select().single();

  if (error) throw error;
  return data;
}

// Iniciar paseo
export async function startWalk(walkId) {
  const { data, error } = await supabase
    .from('walks')
    .update({ status: 'active', started_at: new Date().toISOString() })
    .eq('id', walkId)
    .select().single();

  if (error) throw error;
  return data;
}

// Completar paseo (llama la función SQL que calcula comisión)
export async function completeWalk(walkId) {
  const { error } = await supabase.rpc('complete_walk', { walk_id: walkId });
  if (error) throw error;
}


// ─────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────

export async function getAdminStats() {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });

  const totalCommission = transactions?.reduce((s, t) => s + t.commission, 0) ?? 0;
  const totalVolume = transactions?.reduce((s, t) => s + t.total_amount, 0) ?? 0;
  const totalWalks = transactions?.length ?? 0;

  return { transactions, totalCommission, totalVolume, totalWalks };
}


// ─────────────────────────────────────────
// PERROS
// ─────────────────────────────────────────

export async function getMyDogs() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from('dogs').select('*').eq('owner_id', user.id);
  return data;
}

export async function addDog({ name, size, breed, notes }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('dogs').insert({
    owner_id: user.id, name, size, breed, notes,
  }).select().single();
  if (error) throw error;
  return data;
}
