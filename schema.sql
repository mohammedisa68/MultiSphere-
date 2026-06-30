
-- DATABASE SCHEMA FOR MULTI_SPHERE (Supabase/PostgreSQL)

-- 1. PROFILES TABLE
-- Eenyummaa fi odeeffannoo bu'uuraa fayyadamaa
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  username TEXT UNIQUE,
  full_name TEXT,
  passcode TEXT,
  national_id TEXT UNIQUE,
  avatar_url TEXT DEFAULT 'https://ui-avatars.com/api/?name=User&background=random',
  bio VARCHAR(100),
  wallet_balance DECIMAL(15,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update transactions table to link to profiles or use email for simplicity in this hybrid app
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  type TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'ETB',
  description TEXT,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. RLS (ROW LEVEL SECURITY)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 7. POLICIES (Eegumsa Data)
CREATE POLICY "Users can manage their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can view their own stats" ON public.user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own history" ON public.service_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);

-- 8. AUTOMATIC TRIGGERS
-- Yeroo fayyadamaan haaraan galmaa'u stats isaa create gochuuf
CREATE OR REPLACE FUNCTION public.handle_new_user_stats() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_stats (user_id) VALUES (new.id);
  UPDATE public.global_stats SET total_registered_users = total_registered_users + 1 WHERE id = 1;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_stats();
