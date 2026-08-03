-- note_images バケットを作成
insert into storage.buckets (id, name, public) 
values ('note_images', 'note_images', true)
on conflict (id) do nothing;

-- 誰でも画像をアップロード・閲覧できるポリシーを作成
create policy "Public Access" 
  on storage.objects for select 
  using ( bucket_id = 'note_images' );

create policy "Public Insert" 
  on storage.objects for insert 
  with check ( bucket_id = 'note_images' );

create policy "Public Delete" 
  on storage.objects for delete 
  using ( bucket_id = 'note_images' );
