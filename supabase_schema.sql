-- Nexus Supabase setup
-- Safe to run more than once in the Supabase SQL Editor.

create extension if not exists "uuid-ossp";

-- Folders
create table if not exists public.folders (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    name text not null,
    parent_id uuid references public.folders(id) on delete set null,
    color text,
    icon text,
    created_at timestamptz default now() not null
);

alter table public.folders add column if not exists parent_id uuid references public.folders(id) on delete set null;
alter table public.folders add column if not exists color text;
alter table public.folders add column if not exists icon text;
alter table public.folders add column if not exists created_at timestamptz default now() not null;
alter table public.folders enable row level security;

drop policy if exists "Users can view own folders." on public.folders;
create policy "Users can view own folders."
    on public.folders for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own folders." on public.folders;
create policy "Users can insert own folders."
    on public.folders for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own folders." on public.folders;
create policy "Users can update own folders."
    on public.folders for update
    using (auth.uid() = user_id);

drop policy if exists "Users can delete own folders." on public.folders;
create policy "Users can delete own folders."
    on public.folders for delete
    using (auth.uid() = user_id);

-- Files
create table if not exists public.files (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    name text not null,
    original_filename text not null,
    storage_path text not null,
    public_url text,
    file_type text not null,
    mime_type text,
    size_bytes bigint not null,
    folder_id uuid references public.folders(id) on delete set null,
    category text,
    document_type text,
    custom_type_label text,
    description text,
    tags text[],
    search_text text,
    document_date date,
    academic_year text,
    semester text,
    course_code text,
    course_title text,
    institution text,
    favorite boolean default false not null,
    archived boolean default false not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now()
);

alter table public.files add column if not exists public_url text;
alter table public.files add column if not exists mime_type text;
alter table public.files add column if not exists folder_id uuid references public.folders(id) on delete set null;
alter table public.files add column if not exists category text;
alter table public.files add column if not exists document_type text;
alter table public.files add column if not exists custom_type_label text;
alter table public.files add column if not exists description text;
alter table public.files add column if not exists tags text[];
alter table public.files add column if not exists search_text text;
alter table public.files add column if not exists document_date date;
alter table public.files add column if not exists academic_year text;
alter table public.files add column if not exists semester text;
alter table public.files add column if not exists course_code text;
alter table public.files add column if not exists course_title text;
alter table public.files add column if not exists institution text;
alter table public.files add column if not exists favorite boolean default false not null;
alter table public.files add column if not exists archived boolean default false not null;
alter table public.files add column if not exists updated_at timestamptz default now();
alter table public.files enable row level security;

drop policy if exists "Users can view own files." on public.files;
create policy "Users can view own files."
    on public.files for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own files." on public.files;
create policy "Users can insert own files."
    on public.files for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own files." on public.files;
create policy "Users can update own files."
    on public.files for update
    using (auth.uid() = user_id);

drop policy if exists "Users can delete own files." on public.files;
create policy "Users can delete own files."
    on public.files for delete
    using (auth.uid() = user_id);

create index if not exists folders_user_id_idx on public.folders(user_id);
create index if not exists folders_parent_id_idx on public.folders(parent_id);
create index if not exists files_user_id_idx on public.files(user_id);
create index if not exists files_folder_id_idx on public.files(folder_id);
create index if not exists files_tags_idx on public.files using gin(tags);
create index if not exists files_category_idx on public.files(category);
create index if not exists files_document_type_idx on public.files(document_type);
create index if not exists files_search_text_idx on public.files using gin(to_tsvector('simple', coalesce(search_text, '')));

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.folders to authenticated;
grant select, insert, update, delete on public.files to authenticated;

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('nexus-files', 'nexus-files', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload files to their own path" on storage.objects;
create policy "Users can upload files to their own path"
    on storage.objects for insert
    with check (
        bucket_id = 'nexus-files'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

drop policy if exists "Users can read own files" on storage.objects;
create policy "Users can read own files"
    on storage.objects for select
    using (
        bucket_id = 'nexus-files'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

drop policy if exists "Users can update own files" on storage.objects;
create policy "Users can update own files"
    on storage.objects for update
    using (
        bucket_id = 'nexus-files'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

drop policy if exists "Users can delete own files" on storage.objects;
create policy "Users can delete own files"
    on storage.objects for delete
    using (
        bucket_id = 'nexus-files'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

notify pgrst, 'reload schema';
