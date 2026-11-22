# Flows & Rules

## Flow: remote customer
1. Opens Home -> Join -> picks Haircut + "Any barber" -> gets token S-14, 6th in line.
2. Watches My Status; at 2nd in line gets "Start coming".
3. As soon as Amit is free, the server calls S-14 automatically (rule 3a) -> S-14 becomes Called. If Amit is already free when S-14 joins, this happens immediately. The receptionist can also tap [ Call next ] on Amit's card as a manual override.
4. Customer's phone: "It's your turn! Go to Amit" (full screen); TV flashes S-14 with chime.
5. Amit taps [ Start ] then [ Done ] -> S-14 leaves the queue.

## Flow: walk-in
Receptionist taps [ + Add walk-in ] -> name, phone, services, barber -> joins the same queue at the end (first come, first served). Walk-ins also get a token.

## Flow: no-show and return
Called but not here after 10 min -> receptionist taps [ No-show ]. If the customer arrives later, they join again (receptionist [ + Add walk-in ] or customer [ Join again ]) and get a NEW token at the END of the queue.

## Statuses and allowed moves
- Waiting -> Called -> In chair -> Done.
- Waiting -> Cancelled (customer or receptionist).
- Called -> No-show (receptionist, after 10 min) or Called -> Cancelled.
- Called -> Waiting is NOT allowed when a barber is later put on break; instead the receptionist cancels and re-adds (keep it simple).
- Never backwards. Done, Cancelled and No-show are final.
- An "active spot" means Waiting, Called or In chair.

## Rules
1. **Tokens**: S-1, S-2, ... increase through the day, never reused. Reset when the app restarts / new day.
2. **Order**: first come, first served by join time.
3. **Call next for barber X** picks the earliest Waiting customer who chose X or "Any". It never picks someone who chose another barber.
3a. **Auto-call**: whenever a barber could become free (a customer joins or is added as a walk-in, a barber taps Done, a barber comes back from break, a called customer is cancelled or marked no-show), the server calls waiting customers into free working barbers. Customers are handled earliest first; each gets a free barber who they chose, or any free barber if they chose "Any" (first free barber in list order). Rule 3 still applies: nobody is given a barber they didn't choose. Reception's [ Call next ] stays as a manual override.
4. A barber on break or off duty cannot call next. A barber has at most one Called/In chair customer at a time.
5. **Waiting-time estimate**:
   - Customer's minutes = sum of their selected services.
   - Eligible barbers for a customer = their chosen barber, or all working barbers (on duty, not on break) if "Any".
   - Minutes ahead = remaining time of In chair customers of eligible barbers + total minutes of earlier Waiting/Called customers who could use at least one of those barbers.
   - Wait = Minutes ahead ÷ number of eligible working barbers, rounded up to 5 min. If no eligible barber is working, show "Ravi is on break" instead of a time.
   - Recalculated on every refresh, so it goes down as customers finish.
6. **One active spot per phone number.** Joining again with the same phone shows the existing spot, no duplicate.
7. **Max 3 services** per customer.
8. **Called timeout**: 10 min after Called, receptionist may mark No-show. Not automatic.
9. **Cancel**: customer from My Status (after confirm) or receptionist. Everyone behind moves up.
10. **Online joining closes 30 min before closing time (9 PM -> 8:30 PM)** or when the owner switches the queue to Closed. Walk-ins by receptionist are still allowed.
11. **Barber on break**: customers who chose that barber see "Ravi is on break" on their status; "Any" customers are unaffected. Break is blocked while a customer is in the chair.
12. **Service off**: hidden from Join; existing queue entries keep it.
13. **Sync**: all screens poll the server every 3 s; any change shows on every screen within 5 s. The server holds the single source of truth.
14. **Queue rules live in ONE module on the server** (call next, wait estimate, status transitions). Screens only display results.
15. **Staff PIN**: reception, barber and admin require PIN 2468; /display and customer screens do not. The server rejects staff actions without the PIN.
16. **Barber off duty** (owner toggle on /admin): blocked while that barber has a Called or In-chair customer ("finish the current customer first"). Off-duty barbers are never called or auto-called and don't count as working for wait estimates. Customers still waiting who chose that barber keep their spot and see "Ravi is off duty today" (like the break note); "Any" customers are unaffected. Switching a barber back on duty runs auto-call (rule 3a). An off-duty barber cannot be set on break.
17. **Today's stats** (owner screen). "Today" = the salon's calendar day (Asia/Kolkata). Served = customers marked Done today. No-shows = customers marked No-show today. Average wait = average minutes from joining to being called, over customers called today. With no data, show 0 / "—".
18. **Owner edits services**: add, edit and turn on/off; never delete. EN and GU names are required, minutes 5-180, price 0-5000. Editing minutes or price changes the wait estimate for everyone still waiting. Turning a service off only hides it from new joiners and walk-ins (rule 12).

## Test checklist
- [ ] Join with 2 services -> correct total time and price shown
- [ ] Same phone joins twice -> shown existing spot, no duplicate
- [ ] 4th service selected -> blocked with "Max 3 services"
- [ ] Phone number with fewer than 10 digits -> cannot confirm
- [ ] Call next for Amit skips a customer who chose Ravi
- [ ] Call next for Amit picks the earliest "Any" or Amit customer
- [ ] Barber free + customer joins -> called immediately, phone shows "It's your turn"
- [ ] Barber finishes (Done) -> earliest eligible waiting customer is called automatically
- [ ] Barber on break is never auto-called; coming back from break -> auto-called
- [ ] Call next (manual) -> customer's phone shows "It's your turn" within 5 s
- [ ] Start/Done on Barber View updates Reception and TV within 5 s
- [ ] Barber cannot go on break with a customer in the chair
- [ ] No-show, then re-add -> goes to end of queue with a new token
- [ ] Cancel from My Status -> removed everywhere; others move up
- [ ] Waiting time goes down as customers finish
- [ ] 2nd in line -> "Start coming" banner appears
- [ ] Barber on break -> their customers see "Ravi is on break"
- [ ] Close online queue -> Join button disabled with message; walk-in still works
- [ ] Turn a service off -> disappears from Join
- [ ] Edit a service's minutes/price -> Join summary and wait estimates use the new values
- [ ] Add a service -> appears on Join; turn it off -> disappears, people already queued keep it
- [ ] Service with minutes 3 or price 6000 -> rejected with a clear message
- [ ] Barber off duty -> not selectable on Join, never called; blocked while a customer is with them
- [ ] Barber back on duty -> waiting customers are auto-called
- [ ] Stats show served, average wait and no-shows for today; 0 / "—" when empty
- [ ] Wrong staff PIN -> blocked; correct PIN -> opens
- [ ] Language toggle switches all labels to Gujarati, nothing overflows
- [ ] Phone, tablet and TV windows all stay in sync
