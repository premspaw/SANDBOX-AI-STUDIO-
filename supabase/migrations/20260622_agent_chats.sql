-- Migration: Create Agent Chats Table
-- Persists user chat history to Supabase database.

CREATE TABLE IF NOT EXISTS public.agent_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_chat UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.agent_chats ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only read/write their own chat histories
CREATE POLICY "Allow authenticated read own chat" 
    ON public.agent_chats 
    FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated upsert own chat" 
    ON public.agent_chats 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
