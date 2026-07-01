-- One shareable link per bill. The organizer sends /s/<share_token> to the group chat once;
-- each friend taps their own name there and is taken to their personal pay page.
--
-- claimed_at marks that someone opened a name from the shared link (a soft "seen" signal,
-- not a lock). paid_source records who flipped the paid switch — the friend themselves via
-- their pay link, or the organizer — so the status board can tell the two apart.

alter table bills
  add column if not exists share_token text unique not null
    default encode(gen_random_bytes(16), 'hex');

alter table participants
  add column if not exists claimed_at timestamptz;

alter table participants
  add column if not exists paid_source text
    check (paid_source in ('self', 'organizer'));
