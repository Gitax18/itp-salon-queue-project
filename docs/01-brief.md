# Salon Queue — Brief

## Problem
On weekends customers sit 1–2 hours in the salon without knowing their turn. Some leave; others argue about who came first. Staff have no single view of who is waiting for which barber.

## Users
- **Customer**: joins the queue from their phone, watches their position and wait time.
- **Receptionist**: adds walk-ins, calls the next customer, marks no-shows (tablet).
- **Barber**: sees their current and next customer, taps Start / Done, goes on break (phone).
- **Owner**: manages services, barbers on duty, opens/closes the queue, sees today's stats.

## Must-have features
1. Join the queue from a phone: name, phone, pick service(s) (max 3) and a barber (or "Any").
2. Live status: token, position, estimated wait, "Start coming" alert, "It's your turn!" alert.
3. Receptionist dashboard: add walk-ins, call next, mark no-show, cancel.
4. Barber screen: current customer, Start / Done, on-break toggle.
5. Waiting-area TV: who is with which barber + next 5 tokens.
6. Owner settings: services (name EN/GU, minutes, price, on/off), barbers on duty, open/close queue, today's stats.
7. English / Gujarati language toggle on every screen.
8. Staff screens (reception, barber, owner) protected by one shared PIN.

## Don't build
Online payment, future-date appointments, SMS/WhatsApp notifications, loyalty/offers, multiple branches, per-user accounts or sign-up, database design beyond simple in-memory storage.

## Hosting
Frontend on Vercel, backend (Node/Express) on Heroku. The live link must open the working app on a phone with no setup.

## Look & feel
Premium salon feel: dark charcoal (#1F2937) + gold (#D4A017), rounded cards, clean, mobile-first (tablet for reception, large-text for TV). Labels in English and Gujarati.
