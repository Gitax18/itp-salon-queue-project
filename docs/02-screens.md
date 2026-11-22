# Screens & Features

Global rules (apply to every screen)
- Theme: charcoal #1F2937 background, gold #D4A017 accents, rounded cards, white/grey text.
- Header on every screen: salon name "Royal Cuts" + EN | ગુ toggle (top right). Language choice is remembered.
- All text comes from the EN/GU language file. Prices in ₹, times in "min".
- Mobile = 360–430px wide, single column. Tap targets at least 44px high.
- Data refreshes by polling every 3 seconds; no manual refresh needed.
- Staff screens (/reception, /barber/:name, /admin) show the PIN screen first (Screen 0). /display needs no PIN.

---

## Screen 0: Staff PIN gate (shown in place of any staff screen)
- Who: receptionist, barber, owner. Phone or tablet.
- Elements: title "Staff access", 4-digit PIN field (numeric keypad on phone), [ Unlock ] button.
- Behaviour: correct PIN -> opens the screen, remembered for the browser session. Wrong PIN -> red text "Wrong PIN, try again", field clears.
- Test PIN: 2468 (also listed in README).

## Screen 1: Home (/)
- Who: customers, phone.
- Top to bottom:
  - Salon name + logo, badge "Open · Closes 9 PM" (green) or "Closed" (red).
  - Live card: "6 people waiting · about 50 min" (updates every 3 s).
  - Barber chips: Ravi (busy, amber) · Amit (free, green) · Imran (on break, grey).
  - Big gold button [ Join Queue ] -> /join.
  - Small link "I already joined" -> asks phone number, opens that person's /status/:id.
- States: queue closed or past cutoff -> button disabled with message "Online joining is closed. Walk in and ask reception." Nobody waiting -> "No one waiting — walk right in!"

## Screen 2: Join Queue (/join)
- Who: customers, phone.
- Top to bottom:
  - Name field (required, 2+ chars).
  - Phone field (exactly 10 digits, validated live).
  - Service cards, multi-select, max 3: Haircut 30 min ₹150, Beard trim 15 min ₹80, Hair spa 45 min ₹400, Shave 20 min ₹100, Facial 40 min ₹350. Selected card gets a gold border + tick. Only services switched on by the owner appear.
  - Barber picker: "Any barber (fastest)" (default) or a barber card (photo, name, status). Barbers on break stay selectable with the note "on break".
  - Live summary bar (sticky bottom): "Total 45 min · ₹230 · Expected wait ~35 min", updates as selections change.
  - [ Confirm ] button (disabled until name, phone and 1+ service are valid).
- Buttons: Confirm -> creates token, goes to /status/:id.
- Errors: selecting a 4th service -> shake + "Max 3 services". Phone already has an active spot -> no duplicate, goes straight to that spot's status page with a note "You're already in the queue". Queue closed -> page shows the closed message instead of the form.

## Screen 3: My Status (/status/:id)
- Who: customers, phone.
- Top to bottom:
  - Token large (e.g. "S-14"), position "4th in line".
  - Circular countdown "about 35 min" (updates itself).
  - Details card: name, services, total price, chosen barber.
  - Banner when 2nd in line: "Start coming to the salon".
  - Barber chosen is on break or off duty: amber note "Ravi is on break" / "Ravi is off duty today".
  - [ Cancel my spot ] -> confirmation pop-up "Leave the queue?" [ Yes, cancel ] [ Keep my spot ].
- Called state: full-screen gold "It's your turn! Go to Ravi", large text, gentle pulse, phone vibration. Shows a 10-minute reminder "Please arrive within 10 min".
- Other end states: In chair -> "Enjoy your service", Done -> "Thank you!" + [ Back to home ], Cancelled / No-show -> short message + [ Join again ] (goes to /join; gets a new token at the end).
- Error: unknown id -> "We couldn't find this spot" + [ Back to home ].

## Screen 4: Reception Dashboard (/reception) — tablet, landscape
- Who: receptionist.
- Top bar: salon name, queue state badge, [ + Add walk-in ].
- Left (about 40%): one card per barber in a 3-column row: name, status, current customer + progress bar of time left, [ Call next ]. Break/off-duty barbers show greyed with no button.
- Right (about 60%): waiting list in queue order: token, name, services, preferred barber, waiting time, [ No-show ] (only when Called), [ Cancel ].
- Behaviour:
  - [ + Add walk-in ] opens a quick form (name, phone, services, barber) -> adds to end of queue.
  - Customers are normally called automatically when a barber is free (rule 3a in 03). [ Call next ] on a barber's card is a manual override: it calls the earliest eligible customer; the row turns gold "Called -> Ravi".
  - [ No-show ] appears after 10 min of Called.
  - Waiting more than 60 min -> row highlighted amber.
- Empty states: no one waiting -> "No one waiting — walk right in!". [ Call next ] with nobody eligible -> disabled, tooltip "No eligible customer".

## Screen 5: Barber View (/barber/:name) — phone
- Who: one barber (Ravi, Amit, Imran).
- Top to bottom:
  - Barber name + toggle "Available / On break".
  - Current customer card: token, name, services, timer since start. Empty -> "No customer right now".
  - Big buttons: [ Start ] (when customer is Called) -> [ Done ] (when In chair). Only the valid one is shown.
  - "Next for you: S-15 Kunal (Haircut)" or "No one waiting for you".
- Behaviour: Start/Done reflect on Reception, TV and the customer's phone within 5 s. Switching to break is blocked while a customer is in the chair ("Finish current customer first").
- Unknown barber name -> "Barber not found".

## Screen 6: Waiting Area TV (/display) — landscape, no PIN, readable from 5 m
- Who: customers in the waiting area.
- Layout:
  - Top: salon name, clock, "Open".
  - One row per barber: photo, name, "Now: S-12" (or "Free" / "On break").
  - "Up next" list: next 5 tokens with estimated times, e.g. "S-15 · ~10 min".
  - Newly called token flashes gold with a chime; the first chime requires one click on the page (browser audio rule), shown as a small "Enable sound" button.
- Font: token numbers at least 48px. No interactive buttons except Enable sound.
- Empty: "No one waiting".

## Screen 7: Owner Settings (/admin) — phone or tablet
- Who: owner.
- Top to bottom:
  - Queue switch: Open / Closed for online joining (walk-ins still allowed).
  - Stats cards: customers served today, average wait, no-shows.
  - Services list: name EN, name GU, minutes, price, on/off toggle, [ Edit ] and [ + Add service ].
  - Barbers on duty today: toggle per barber.
- Behaviour: turning a service off hides it from /join immediately (people already in the queue keep it). Closing the queue disables Join with the message on Home and Join. Validation: minutes 5–180, price 0–5000, EN and GU names required. [ Edit ] and [ + Add service ] open the same small form (name EN, name GU, minutes, price). Services are never deleted, only turned off. Switching a barber off duty is blocked while they have a customer ("Finish the current customer first"). Rules 16-18 in 03.
- Empty: no stats yet -> cards show 0 / "—".
