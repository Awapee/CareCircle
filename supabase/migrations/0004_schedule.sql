-- Runs the scheduler every minute with pg_cron.
-- In Supabase: Database → Extensions → enable "pg_cron" first, then apply this migration.
create extension if not exists pg_cron;

select cron.schedule('carecircle-scheduler', '* * * * *', $$ select public.run_scheduler(); $$);
