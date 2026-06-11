# Oracle Ops — Supabase

Project: `oracle-ops` (ref `ouiqyobfxevjxydapeyt`, ap-southeast-1) — SHARED with another app's tables; everything Oracle Ops owns is prefixed `oo_` (tables `oo_state`, `oo_events`; RPCs `oo_state_merge`, `oo_state_set_path`, `oo_state_increment`, `oo_timer_roll`, `oo_server_now`; buckets `oo-audio`, `oo-media`).

Schema lives in the applied migrations `oracle_ops_init` and `oracle_ops_seed` (see Supabase dashboard → Database → Migrations).
