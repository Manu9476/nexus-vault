-- Supabase Schema for Arkive

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- FOLDERS Table
create table public.folders (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    name text not null,
    color text,
    icon text,
    created_at timestamptz default now() not null
);

alter table public.folders enable row level security;

create policy "Users can view own folders."
    on public.folders for select
    using ( auth.uid() = user_id );

create policy "Users can insert own folders."
    on public.folders for insert
    with check ( auth.uid() = user_id );

create policy "Users can update own folders."
    on public.folders for update
    using ( auth.uid() = user_id );

create policy "Users can delete own folders."
    on public.folders for delete
    using ( auth.uid() = user_id );


-- FILES Table
create table public.files (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    name text not null,
    original_filename text not null,
    storage_path text not null,
    public_url text,
    file_type text not null,
    mime_type text,
    size_bytes bigint not null,
    folder_id uuid references public.folders on delete set null,
    description text,
    tags text[],
    created_at timestamptz default now() not null,
    updated_at timestamptz default now()
);

alter table public.files enable row level security;

create policy "Users can view own files."
    on public.files for select
    using ( auth.uid() = user_id );

create policy "Users can insert own files."
    on public.files for insert
    with check ( auth.uid() = user_id );

create policy "Users can update own files."
    on public.files for update
    using ( auth.uid() = user_id );

create policy "Users can delete own files."
    on public.files for delete
    using ( auth.uid() = user_id );

-- STORAGE BUCKET
insert into storage.buckets (id, name, public) values ('nexus-files', 'nexus-files', false) on conflict do nothing;

create policy "Users can upload files to their own path"
    on storage.objects for insert
    with check (
        bucket_id = 'nexus-files' and 
        auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Users can read own files"
    on storage.objects for select
    using (
        bucket_id = 'nexus-files' and 
        auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Users can update own files"
    on storage.objects for update
    using (
        bucket_id = 'nexus-files' and 
        auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Users can delete own files"
    on storage.objects for delete
    using (
        bucket_id = 'nexus-files' and 
        auth.uid()::text = (storage.foldername(name))[1]
    );
